import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatGateway } from './chat.gateway';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => ChatGateway)) private chatGateway: ChatGateway,
  ) {}

  async getConversations(userId: string) {
    console.log(`📋 [ChatService] getConversations called for user: ${userId}`);
    
    // 🔥 EN BASİT VE GÜVENİLİR YÖNTEM: Kullanıcının participant olduğu TÜM conversation'ları bul
    const allConversations = await this.prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId: userId,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                fullName: true,
                isOnline: true,
                lastSeen: true,
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    console.log(`📋 [ChatService] Found ${allConversations.length} conversations where user ${userId} is a participant`);

    // 🔥 KRİTİK: Her conversation için UserConversation kaydını garantile
    await Promise.all(
      allConversations.map(async (conv) => {
        try {
          await this.prisma.userConversation.upsert({
            where: {
              userId_conversationId: {
                userId: userId,
                conversationId: conv.id,
              },
            },
            create: {
              userId: userId,
              conversationId: conv.id,
              isDeleted: false,
            },
            update: {
              isDeleted: false, // Eğer silinmişse geri getir
            },
          });
        } catch (error) {
          if (error.code !== 'P2002') {
            console.error(`❌ [ChatService] Failed to ensure UserConversation: ${error.message}`);
          }
        }
      }),
    );

    // 🔥 KRİTİK: UserConversation kaydı olan ve silinmemiş conversation'ları filtrele
    const userConversations = await this.prisma.userConversation.findMany({
      where: {
        userId,
        isDeleted: false,
        conversationId: { in: allConversations.map((c) => c.id) },
      },
      select: {
        conversationId: true,
      },
    });

    const visibleConversationIds = new Set(userConversations.map((uc) => uc.conversationId));
    
    // 🔥 KRİTİK: UserConversation kaydı olmayan conversation'ları da dahil et
    // Çünkü mesaj gönderildiğinde UserConversation kaydı oluşturuluyor ama
    // sayfa yenilendiğinde henüz oluşturulmamış olabilir
    // Bu durumda, conversation'da mesaj varsa göster
    // Ayrıca, kullanıcının mesaj gönderdiği/alığı conversation'ları da kontrol et
    // ✅ KRİTİK: Ama eğer UserConversation kaydı varsa ve isDeleted: true ise, ASLA gösterme
    const conversationsWithMessages = await Promise.all(
      allConversations.map(async (c) => {
        // ✅ KRİTİK: UserConversation kaydı varsa ve silinmemişse göster
        if (visibleConversationIds.has(c.id)) {
          return { conv: c, shouldShow: true };
        }
        
        // ✅ KRİTİK: UserConversation kaydı var ama isDeleted: true ise, ASLA gösterme
        // (Kullanıcı conversation'ı silmişse, geri gelmemeli)
        const userConv = await this.prisma.userConversation.findUnique({
          where: {
            userId_conversationId: {
              userId: userId,
              conversationId: c.id,
            },
          },
          select: {
            isDeleted: true,
          },
        });
        
        if (userConv && userConv.isDeleted) {
          return { conv: c, shouldShow: false }; // ✅ Silinmiş conversation'ı gösterme
        }
        
        // UserConversation kaydı yoksa, conversation'da herhangi bir mesaj var mı kontrol et
        // (mesaj gönderilmiş ama UserConversation henüz oluşturulmamış olabilir)
        // Kullanıcı participant olduğu için, conversation'da mesaj varsa göster
        const hasMessage = await this.prisma.message.count({
          where: {
            conversationId: c.id,
            isDeleted: false,
          },
          take: 1,
        });
        
        return { conv: c, shouldShow: hasMessage > 0 };
      })
    );
    
    const filteredConversations = conversationsWithMessages
      .filter(({ shouldShow }) => shouldShow)
      .map(({ conv }) => conv);

    console.log(`📋 [ChatService] Returning ${filteredConversations.length} conversations for user ${userId} (after filtering)`);

    // Her konuşma için okunmamış mesaj sayısını ekle
    const conversationsWithUnread = await Promise.all(
      filteredConversations.map(async (conv) => {
        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            read: false,
            isDeleted: false,
          },
        });

        return {
          ...conv,
          unreadCount,
        };
      }),
    );

    return conversationsWithUnread;
  }

  // 🔥 OKUNMAMIŞ MESAJ SAYISI (Bildirimler gibi - sidebar için)
  async getUnreadMessageCount(userId: string): Promise<number> {
    // Kullanıcının tüm conversation'larında okunmamış mesaj sayısını topla
    const conversations = await this.prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId,
            isDeleted: false,
          },
        },
      },
      select: {
        id: true,
      },
    });

    const conversationIds = conversations.map((c) => c.id);

    if (conversationIds.length === 0) {
      return 0;
    }

    // Tüm conversation'larda okunmamış mesaj sayısını topla
    const totalUnread = await this.prisma.message.count({
      where: {
        conversationId: { in: conversationIds },
        senderId: { not: userId }, // Kendi gönderdiği mesajlar değil
        read: false,
        isDeleted: false,
      },
    });

    return totalUnread;
  }

  async getConversation(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                fullName: true,
                isPrivate: true,
                isOnline: true,
                lastSeen: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const hasAccess = conversation.participants.some((p) => p.userId === userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    return conversation;
  }

  async getMessages(conversationId: string, userId: string, limit: number = 50, cursor?: string) {
    // Erişim kontrolü
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const hasAccess = conversation.participants.some((p) => p.userId === userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    // Mesajları getir (silinmemiş olanlar)
    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        isDeleted: false, // 🔥 KRİTİK: Sadece silinmemiş mesajları getir
        ...(cursor && {
          createdAt: { lt: new Date(cursor) },
        }),
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit + 1,
    });

    // Mesajları ters çevir (en eski en üstte, en yeni en altta - Instagram gibi)
    const reversedMessages = messages.reverse();

    const hasMore = reversedMessages.length > limit;
    const messagesToReturn = hasMore ? reversedMessages.slice(0, limit) : reversedMessages;

    return {
      messages: messagesToReturn.reverse(), // Eski mesajlar en başta olmalı
      hasMore,
      nextCursor: hasMore ? messagesToReturn[0]?.createdAt.toISOString() : null,
    };
  }

  async createConversation(userId: string, participantIds: string[], context?: 'DIRECT' | 'JOB_APPLICATION', jobId?: string, applicationId?: string) {
    // Geçerli participant ID'leri filtrele
    const validParticipantIds = participantIds.filter((id) => id && typeof id === 'string' && id.trim() !== '');
    
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid userId');
    }

    // Kendi ID'sini ekle
    const allParticipants = [userId, ...validParticipantIds.filter((id) => id !== userId)];

    if (allParticipants.length < 2) {
      throw new Error('At least 2 participants required');
    }

    // ✅ KRİTİK: Participant sırasız unique kontrolü (A-B ve B-A aynı conversation)
    const sortedParticipantIds = allParticipants.sort();

    // 🔥 DOĞRU DUPLICATE KONTROLÜ: Context'e göre farklı mantık
    let existingConversation = null;

    if (context === 'JOB_APPLICATION' && applicationId) {
      // JOB_APPLICATION: applicationId'ye göre unique (bir başvuru = bir conversation)
      // Prisma client generate edilene kadar type assertion kullan
      const conversationsWithApplication = await this.prisma.conversation.findMany({
        where: {
          // @ts-ignore - Prisma client generate edilene kadar
          applicationId: applicationId,
          // @ts-ignore - Prisma client generate edilene kadar
          context: 'JOB_APPLICATION',
        },
        include: {
          participants: true,
        },
      });

      // Aynı applicationId'ye sahip conversation var mı kontrol et
      for (const conv of conversationsWithApplication) {
        const convAny = conv as any;
        const convParticipantIds = convAny.participants.map((p: any) => p.userId).sort();
        if (
          convParticipantIds.length === sortedParticipantIds.length &&
          convParticipantIds.every((id, index) => id === sortedParticipantIds[index])
        ) {
          existingConversation = conv;
          break;
        }
      }
    } else {
      // DIRECT: Sadece participant'lara bak (context/jobId/applicationId ignore edilir)
      // ✅ ALTIN KURAL: İki kullanıcı arasında DIRECT context'te SADECE 1 conversation olabilir
      const userConversations = await this.prisma.conversation.findMany({
        where: {
          participants: {
            some: {
              userId: userId,
            },
          },
          // @ts-ignore - Prisma client generate edilene kadar
          ...(context === 'DIRECT' ? { context: 'DIRECT' } : {}),
        },
        include: {
          participants: true,
        },
      });

      // Participant sırasız kontrol (A-B ve B-A aynı)
      for (const conv of userConversations) {
        const convAny = conv as any;
        const convParticipantIds = convAny.participants.map((p: any) => p.userId).sort();
        
        // Participant sayısı ve ID'leri aynı mı kontrol et
        if (
          convParticipantIds.length === sortedParticipantIds.length &&
          convParticipantIds.every((id, index) => id === sortedParticipantIds[index])
        ) {
          // DIRECT context için: context/jobId/applicationId'yi ignore et, sadece participant'lara bak
          if (context === 'DIRECT' || !context) {
            existingConversation = conv;
            break;
          }
          // JOB_APPLICATION context için: applicationId de eşleşmeli (yukarıda kontrol edildi)
        }
      }
    }

    // ✅ Mevcut conversation bulunduysa, onu dön ve UserConversation kayıtlarını garantile
    if (existingConversation) {
      // 🔥 KRİTİK: Mevcut conversation için UserConversation kayıtlarını garantile
      await Promise.all(
        allParticipants.map(async (participantId) => {
          try {
            await this.prisma.userConversation.upsert({
              where: {
                userId_conversationId: {
                  userId: participantId,
                  conversationId: existingConversation.id,
                },
              },
              create: {
                userId: participantId,
                conversationId: existingConversation.id,
                isDeleted: false,
              },
              update: {
                isDeleted: false, // Eğer silinmişse geri getir
              },
            });
            console.log(`✅ [ChatService] UserConversation ensured for user ${participantId} in existing conversation ${existingConversation.id}`);
          } catch (error) {
            if (error.code !== 'P2002') {
              console.error(`❌ [ChatService] Failed to ensure UserConversation for user ${participantId}: ${error.message}`);
            }
          }
        }),
      );

      console.log(`✅ [ChatService] Existing conversation found: ${existingConversation.id} (participants: ${sortedParticipantIds.join(', ')})`);

      // Mevcut conversation'ı tam format ile dön
      return this.prisma.conversation.findUnique({
        where: { id: existingConversation.id },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  avatar: true,
                  fullName: true,
                  isOnline: true,
                  lastSeen: true,
                },
              },
            },
          },
        },
      });
    }

    // Yeni konuşma oluştur
    // Prisma client generate edilene kadar type assertion kullan
    const conversationData: any = {
      participants: {
        create: allParticipants.map((participantId) => ({
          userId: participantId,
        })),
      },
    }
    
    // Prisma client generate edilene kadar context, jobId ve applicationId'yi optional olarak ekle
    if (context) {
      conversationData.context = context
    }
    if (jobId) {
      conversationData.jobId = jobId
    }
    if (applicationId) {
      conversationData.applicationId = applicationId
    }
    
    const conversation = await this.prisma.conversation.create({
      data: conversationData,
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                fullName: true,
                isOnline: true,
                lastSeen: true,
              },
            },
          },
        },
      },
    });

    // 🔥 KRİTİK: Her participant için UserConversation kaydı oluştur
    // Bu, conversation'ın listelerde görünmesi için ZORUNLU
    await Promise.all(
      allParticipants.map(async (participantId) => {
        try {
          await this.prisma.userConversation.create({
            data: {
              userId: participantId,
              conversationId: conversation.id,
              isDeleted: false,
            },
          });
          console.log(`✅ [ChatService] UserConversation created for user ${participantId} in conversation ${conversation.id}`);
        } catch (error) {
          // Eğer zaten varsa (race condition), hata verme
          if (error.code !== 'P2002') {
            console.error(`❌ [ChatService] Failed to create UserConversation for user ${participantId}: ${error.message}`);
          }
        }
      }),
    );

    return conversation;
  }

  async markAsRead(conversationId: string, userId: string) {
    // Erişim kontrolü
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const hasAccess = conversation.participants.some((p) => p.userId === userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    // Mesajları okundu olarak işaretle
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        read: false,
      },
      data: {
        read: true,
      },
    });

    return { success: true };
  }

  async deleteConversation(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const hasAccess = conversation.participants.some((p) => p.userId === userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    // ✅ SOFT DELETE: Kullanıcıya özel sohbet silme (gerçek silme değil)
    await this.prisma.userConversation.updateMany({
      where: {
        conversationId,
        userId,
      },
      data: {
        isDeleted: true,
      },
    });

    return { success: true };
  }

  async editMessage(messageId: string, userId: string, newContent: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: { participants: true },
        },
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Sadece mesaj sahibi düzenleyebilir
    if (message.senderId !== userId) {
      throw new ForbiddenException('Bu mesajı düzenleme yetkiniz yok');
    }

    // Silinmiş mesajlar düzenlenemez
    if (message.isDeleted) {
      throw new BadRequestException('Silinmiş mesaj düzenlenemez');
    }

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        content: newContent,
        isEdited: true,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        conversation: {
          select: {
            id: true,
          },
        },
      },
    });

    // Socket.IO ile gerçek zamanlı güncelleme
    if (this.chatGateway) {
      await this.chatGateway.broadcastMessageEdited(updated);
    }

    return updated;
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: { participants: true },
        },
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Sadece mesaj sahibi silebilir
    if (message.senderId !== userId) {
      throw new ForbiddenException('Bu mesajı silme yetkiniz yok');
    }

    const updated = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        content: null,
        imageUrl: null,
      },
    });

    // Socket.IO ile gerçek zamanlı güncelleme
    if (this.chatGateway) {
      await this.chatGateway.broadcastMessageDeleted(messageId, message.conversationId);
    }

    return updated;
  }

  async getMedia(conversationId: string, userId: string) {
    // Konuşma erişim kontrolü
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const hasAccess = conversation.participants.some((p) => p.userId === userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    // Sadece görsel mesajları getir (silinmemiş olanlar)
    return this.prisma.message.findMany({
      where: {
        conversationId,
        imageUrl: { not: null },
        isDeleted: false,
      },
      select: {
        id: true,
        imageUrl: true,
        createdAt: true,
        senderId: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFiles(conversationId: string, userId: string) {
    // Konuşma erişim kontrolü
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const hasAccess = conversation.participants.some((p) => p.userId === userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    // Sadece dosya mesajlarını getir (silinmemiş olanlar)
    return this.prisma.message.findMany({
      where: {
        conversationId,
        fileUrl: { not: null },
        isDeleted: false,
      },
      select: {
        id: true,
        fileUrl: true,
        fileName: true,
        fileType: true,
        createdAt: true,
        senderId: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 🔥 INSTAGRAM MANTIĞI: Mesaj isteklerini getir
  async getMessageRequests(userId: string) {
    // Bu kullanıcıya gelen ve isRequest=true olan mesajları içeren konuşmaları bul
    const conversations = await this.prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId,
            isDeleted: false,
          },
        },
        messages: {
          some: {
            senderId: { not: userId }, // Kendi gönderdiğimiz mesajlar değil
            isRequest: true, // Sadece istek mesajları
            isDeleted: false,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                fullName: true,
                isOnline: true,
                lastSeen: true,
              },
            },
          },
        },
        messages: {
          where: {
            isRequest: true,
            isDeleted: false,
          },
          take: 1,
          orderBy: {
            createdAt: 'desc',
          },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return conversations;
  }

  // 🔥 INSTAGRAM MANTIĞI: Mesaj isteğini kabul et
  async acceptMessageRequest(conversationId: string, userId: string) {
    // Erişim kontrolü
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const hasAccess = conversation.participants.some((p) => p.userId === userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    // Bu konuşmadaki tüm istek mesajlarını normal mesaja çevir
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        isRequest: true,
        isDeleted: false,
      },
      data: {
        isRequest: false,
      },
    });

    return { success: true };
  }

  // 🔥 INSTAGRAM MANTIĞI: Mesaj isteğini reddet (mesajları sil)
  async declineMessageRequest(conversationId: string, userId: string) {
    // Erişim kontrolü
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { participants: true },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const hasAccess = conversation.participants.some((p) => p.userId === userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    // Bu konuşmadaki tüm istek mesajlarını sil
    await this.prisma.message.updateMany({
      where: {
        conversationId,
        isRequest: true,
        isDeleted: false,
      },
      data: {
        isDeleted: true,
        content: null,
        imageUrl: null,
        fileUrl: null,
      },
    });

    // Konuşmayı da sil (soft delete)
    await this.prisma.userConversation.updateMany({
      where: {
        conversationId,
        userId,
      },
      data: {
        isDeleted: true,
      },
    });

    return { success: true };
  }
}

