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
    
    // ✅ DOĞRU MANTIK: Kullanıcının sadece kendi conversation'larını getir
    // UserConversation tablosuna göre filtrele (isDeleted: false olanlar)
    const userConversations = await this.prisma.userConversation.findMany({
      where: {
        userId,
        isDeleted: false,
      },
      include: {
        conversation: {
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
        },
      },
      orderBy: {
        conversation: {
          updatedAt: 'desc',
        },
      },
    });

    // UserConversation'dan conversation'ları çıkar
    const allConversations = userConversations.map((uc) => uc.conversation).filter(Boolean);

    console.log(`📋 [ChatService] Found ${allConversations.length} conversations for user ${userId}`);

    // ✅ Sadece mesajı olan conversation'ları göster (boş conversation'ları gösterme)
    const conversationsWithMessages = await Promise.all(
      allConversations.map(async (c) => {
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

    console.log(`📋 [ChatService] Returning ${filteredConversations.length} conversations for user ${userId} (with messages)`);

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
      // 🔥 GÜÇLENDİRİLMİŞ KONTROL: Tüm conversation'ları kontrol et (context filtresi yok)
      const allUserConversations = await this.prisma.conversation.findMany({
        where: {
          participants: {
            some: {
              userId: userId,
            },
          },
        },
        include: {
          participants: true,
        },
      });

      // Participant sırasız kontrol (A-B ve B-A aynı)
      // DIRECT context için: context/jobId/applicationId'yi TAMAMEN ignore et
      for (const conv of allUserConversations) {
        const convAny = conv as any;
        const convParticipantIds = convAny.participants.map((p: any) => p.userId).sort();
        
        // Participant sayısı ve ID'leri aynı mı kontrol et
        if (
          convParticipantIds.length === sortedParticipantIds.length &&
          convParticipantIds.every((id, index) => id === sortedParticipantIds[index])
        ) {
          // ✅ KRİTİK: DIRECT context için: context/jobId/applicationId'yi TAMAMEN ignore et
          // Sadece participant'lara bak - aynı iki kullanıcı arasında SADECE 1 conversation olabilir
          if (context === 'DIRECT' || !context) {
            existingConversation = conv;
            console.log(`✅ [ChatService] Found existing DIRECT conversation: ${conv.id} (ignoring context/jobId/applicationId)`);
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

    // ✅ KRİTİK: Conversation'ın lastMessage'ını güncelle (düzenlenen mesaj son mesajsa)
    // Son mesajı kontrol et
    const lastMessage = await this.prisma.message.findFirst({
      where: {
        conversationId: message.conversationId,
        isDeleted: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 1,
    });

    if (lastMessage && lastMessage.id === messageId) {
      // Düzenlenen mesaj son mesajsa, conversation'ı güncelle
      await this.prisma.conversation.update({
        where: { id: message.conversationId },
        data: {
          lastMessage: newContent,
          updatedAt: new Date(),
        },
      });
      console.log(`✅ [ChatService] Conversation lastMessage updated after edit: ${newContent.substring(0, 50)}...`);
    }

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

    // ✅ KRİTİK: Conversation'ın lastMessage'ını güncelle (silinen mesaj son mesajsa)
    // Son mesajı kontrol et
    const lastMessage = await this.prisma.message.findFirst({
      where: {
        conversationId: message.conversationId,
        isDeleted: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 1,
    });

    if (lastMessage && lastMessage.id === messageId) {
      // Silinen mesaj son mesajsa, bir önceki mesajı bul
      const previousMessage = await this.prisma.message.findFirst({
        where: {
          conversationId: message.conversationId,
          isDeleted: false,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: 1,
        take: 1,
      });

      const lastMessageText = previousMessage
        ? (previousMessage.content ?? (previousMessage.imageUrl ? '📷 Fotoğraf' : (previousMessage.fileUrl ? '📎 Dosya' : 'Yeni mesaj')))
        : null;

      await this.prisma.conversation.update({
        where: { id: message.conversationId },
        data: {
          lastMessage: lastMessageText,
          updatedAt: new Date(),
        },
      });
      console.log(`✅ [ChatService] Conversation lastMessage updated after delete: ${lastMessageText ? lastMessageText.substring(0, 50) + '...' : 'null'}`);
    }

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

