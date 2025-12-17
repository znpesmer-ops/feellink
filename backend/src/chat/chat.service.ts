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
    const conversations = await this.prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId,
            isDeleted: false, // ✅ Sadece silinmemiş sohbetleri göster
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

    // Her konuşma için okunmamış mesaj sayısını ekle
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            read: false,
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

    // Mesajları getir
    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
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

    const hasMore = messages.length > limit;
    const messagesToReturn = hasMore ? messages.slice(0, limit) : messages;

    return {
      messages: messagesToReturn.reverse(), // Eski mesajlar en başta olmalı
      hasMore,
      nextCursor: hasMore ? messagesToReturn[0]?.createdAt.toISOString() : null,
    };
  }

  async createConversation(userId: string, participantIds: string[]) {
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

    // ✅ GÜVENLİ DUPLICATE KONTROLÜ: Aynı katılımcılarla bir konuşma var mı kontrol et
    // Önce bu kullanıcının tüm conversation'larını al
    const userConversations = await this.prisma.conversation.findMany({
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

    // Aynı participant setine sahip conversation'ı bul
    const sortedSearchIds = allParticipants.sort();
    for (const conv of userConversations) {
      const convParticipantIds = conv.participants.map((p) => p.userId).sort();
      
      // Participant sayısı ve ID'leri aynı mı kontrol et
      if (
        convParticipantIds.length === sortedSearchIds.length &&
        convParticipantIds.every((id, index) => id === sortedSearchIds[index])
      ) {
        // Mevcut conversation'ı tam format ile dön
        return this.prisma.conversation.findUnique({
          where: { id: conv.id },
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
    }

    // Yeni konuşma oluştur
    const conversation = await this.prisma.conversation.create({
      data: {
        participants: {
          create: allParticipants.map((participantId) => ({
            userId: participantId,
          })),
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
      },
    });

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
}

