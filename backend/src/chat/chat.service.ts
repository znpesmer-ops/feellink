import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatGateway } from './chat.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { PostsService } from '../posts/posts.service';
import { BlocksService } from '../blocks/blocks.service';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => ChatGateway)) private chatGateway: ChatGateway,
    private notificationsService: NotificationsService,
    @Inject(forwardRef(() => PostsService))
    private postsService: PostsService,
    private blocksService: BlocksService,
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

    // Her konuşma için okunmamış mesaj sayısı + diğer katılımcı için lastActiveAt
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

        const participantsWithLastActive = await Promise.all(
          conv.participants.map(async (p) => {
            const u = p.user as { id: string; username: string; avatar?: string; fullName?: string; isOnline: boolean; lastSeen: Date | null };
            if (u.id === userId) {
              return { ...p, user: { ...u, lastActiveAt: u.lastSeen ?? null } };
            }
            const lastMsg = await this.prisma.message.findFirst({
              where: { conversationId: conv.id, senderId: u.id, isDeleted: false },
              orderBy: { updatedAt: 'desc' },
              select: { updatedAt: true },
            });
            const lastActiveAt = u.lastSeen ?? lastMsg?.updatedAt ?? conv.updatedAt ?? null;
            return { ...p, user: { ...u, lastActiveAt } };
          }),
        );

        return {
          ...conv,
          participants: participantsWithLastActive,
          unreadCount,
        };
      }),
    );

    return this.dedupeDirectPeerConversations(userId, conversationsWithUnread);
  }

  /**
   * Aynı kişiyle birden fazla DIRECT 1:1 thread listelenmesin: kanonik conversation id + birleşik unread;
   * önizleme için en güncel updatedAt'lı satırın mesajları kullanılır.
   */
  private async dedupeDirectPeerConversations(userId: string, items: any[]): Promise<any[]> {
    const nu = this.normalizeChatUserId(userId);
    const rest: any[] = [];
    const buckets = new Map<string, any[]>();

    for (const item of items) {
      const ctx = (item as { context?: string }).context;
      const parts = item.participants || [];
      if (parts.length === 2 && ctx === 'DIRECT') {
        const other = parts.find((p: { userId: string }) => this.normalizeChatUserId(p.userId) !== nu);
        const peerId = other ? this.normalizeChatUserId(other.userId) : '';
        if (!peerId) {
          rest.push(item);
          continue;
        }
        const arr = buckets.get(peerId) || [];
        arr.push(item);
        buckets.set(peerId, arr);
      } else {
        rest.push(item);
      }
    }

    const merged: any[] = [];

    for (const [peerKey, group] of buckets) {
      if (group.length === 1) {
        merged.push(group[0]);
        continue;
      }

      const canonical = await this.findExistingDirectPairConversation(nu, peerKey);
      const canonicalId = canonical?.id ?? group[0].id;
      const mergedUnread = group.reduce((s, g) => s + (Number(g.unreadCount) || 0), 0);
      const latest = group.reduce((best: any, c: any) =>
        new Date(c.updatedAt).getTime() > new Date(best.updatedAt).getTime() ? c : best,
      group[0]);
      const base = group.find((c: any) => c.id === canonicalId) ?? latest;
      const maxUpdatedMs = Math.max(...group.map((c: any) => new Date(c.updatedAt).getTime()));

      merged.push({
        ...base,
        id: canonicalId,
        unreadCount: mergedUnread,
        updatedAt: new Date(maxUpdatedMs),
        messages: latest.messages,
        lastMessage: latest.lastMessage ?? base.lastMessage,
      });
    }

    return [...merged, ...rest].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
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

    const participantsWithLastActive = await Promise.all(
      conversation.participants.map(async (p) => {
        const u = p.user as { id: string; username: string; avatar?: string; fullName?: string; isPrivate?: boolean; isOnline: boolean; lastSeen: Date | null };
        if (u.id === userId) {
          return { ...p, user: { ...u, lastActiveAt: u.lastSeen ?? null } };
        }
        const lastMsg = await this.prisma.message.findFirst({
          where: { conversationId, senderId: u.id, isDeleted: false },
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true },
        });
        const lastActiveAt = u.lastSeen ?? lastMsg?.updatedAt ?? conversation.updatedAt ?? null;
        return { ...p, user: { ...u, lastActiveAt } };
      }),
    );

    return { ...conversation, participants: participantsWithLastActive };
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

    // 🕐 SON GÖRÜLME GÜNCELLEMESİ (mesaj açıldığında)
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          lastSeen: new Date(),
          isOnline: true,
        },
      });
    } catch (error) {
      console.warn(`⚠️ [getMessages] Failed to update lastSeen:`, error);
    }

    // Mesajları getir (silinmemiş olanlar) - ARTAN SIRA (eski → yeni)
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
            fullName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc', // ✅ Eski mesajlar üstte, yeni mesajlar altta (Instagram/WhatsApp gibi)
      },
      take: limit + 1,
    });

    // ✅ Mesajlar zaten doğru sırada (asc), reverse() YAPMA!
    const hasMore = messages.length > limit;
    const messagesToReturn = hasMore ? messages.slice(0, limit) : messages;

    const shareIds = messagesToReturn
      .filter((m: any) => (m.messageType || 'TEXT') === 'POST_SHARE' && m.sharedPostId)
      .map((m: any) => String(m.sharedPostId));
    let previewMap: Record<string, any> = {};
    if (shareIds.length > 0 && this.postsService) {
      previewMap = await this.postsService.getSharedPostPreviewsMap(userId, shareIds);
    }

    const messagesWithPreview = messagesToReturn.map((m: any) => {
      const mt = m.messageType || 'TEXT';
      const sid = m.sharedPostId ? String(m.sharedPostId) : null;
      const sharedPostPreview =
        mt === 'POST_SHARE' && sid
          ? previewMap[sid] || { postId: sid, state: 'deleted' as const }
          : undefined;
      return { ...m, messageType: mt, sharedPostPreview };
    });

    return {
      messages: messagesWithPreview,
      hasMore,
      nextCursor: hasMore ? messagesToReturn[messagesToReturn.length - 1]?.createdAt.toISOString() : null,
    };
  }

  /**
   * POST_SHARE mesajı (REST paylaşım akışı). Metin/görsel DM akışını bozmaz.
   */
  async sendPostShareMessage(senderId: string, conversationId: string, sharedPostId: string) {
    const pid = String(sharedPostId || '').trim();
    if (!pid) {
      throw new BadRequestException('sharedPostId gerekli');
    }

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
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const hasAccess = conversation.participants.some((p) => p.userId === senderId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    const otherParticipant = conversation.participants.find((p) => p.userId !== senderId);
    if (!otherParticipant) {
      throw new BadRequestException('Invalid conversation');
    }

    if (await this.blocksService.isBlocked(senderId, otherParticipant.userId)) {
      throw new ForbiddenException('Bu kullanıcıyla paylaşım yapılamıyor.');
    }

    let isRequest = false;
    const recipientUser = await this.prisma.user.findUnique({
      where: { id: otherParticipant.userId },
      select: { id: true, isPrivate: true },
    });
    if (recipientUser?.isPrivate) {
      const isFollowing = await this.prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: senderId,
            followingId: recipientUser.id,
          },
        },
      });
      if (!isFollowing) {
        isRequest = true;
      }
    }

    try {
      await this.prisma.user.update({
        where: { id: senderId },
        data: { lastSeen: new Date(), isOnline: true },
      });
    } catch {
      /* ignore */
    }

    const conversationAny = conversation as any;
    const messageContext = conversationAny.context || 'DIRECT';
    const messageJobId = conversationAny.jobId || null;
    const messageApplicationId = conversationAny.applicationId || null;

    const messageData: any = {
      conversationId,
      senderId,
      content: null,
      imageUrl: null,
      fileUrl: null,
      fileName: null,
      fileType: null,
      messageType: 'POST_SHARE',
      sharedPostId: pid,
      isRequest,
      isDeleted: false,
      read: false,
    };
    if (messageContext) {
      messageData.context = messageContext;
    }
    if (messageJobId) {
      messageData.jobId = messageJobId;
    }
    if (messageApplicationId) {
      messageData.applicationId = messageApplicationId;
    }

    const message = await this.prisma.message.create({
      data: messageData,
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true,
            fullName: true,
          },
        },
      },
    });

    const lastMessageText = '📎 Bir gönderi paylaştı';
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessage: lastMessageText,
        updatedAt: new Date(),
      },
    });

    if (this.chatGateway && typeof (this.chatGateway as any).broadcastMessageImmediately === 'function') {
      try {
        const msgForSocket = { ...message, messageType: 'POST_SHARE', sharedPostId: pid };
        (this.chatGateway as any).broadcastMessageImmediately(
          msgForSocket,
          conversation,
          senderId,
          conversationId,
        );
      } catch (error) {
        console.warn('[ChatService] sendPostShare broadcast failed:', error);
      }
    }

    const recipient = conversation.participants.find((p) => p.userId !== senderId);
    if (recipient) {
      this.notificationsService
        .createNotificationSync({
          userId: recipient.userId,
          type: 'message',
          fromUserId: senderId,
          targetPath: '/messages',
          targetUrl: '/messages',
        })
        .catch((err) => {
          console.warn('[ChatService] Post share notification failed:', err?.message || err);
        });

      await this.prisma.userConversation
        .upsert({
          where: {
            userId_conversationId: {
              userId: recipient.userId,
              conversationId,
            },
          },
          create: {
            userId: recipient.userId,
            conversationId,
            isDeleted: false,
          },
          update: { isDeleted: false },
        })
        .catch(() => undefined);
    }

    return message;
  }

  // ✅ REST API için mesaj gönderme metodu (ChatGateway'den taşındı)
  async createMessage(
    userId: string,
    conversationId: string,
    content?: string,
    imageUrl?: string,
    fileUrl?: string,
    fileName?: string,
    fileType?: string,
  ) {
    // En az content, imageUrl veya fileUrl biri olmalı
    if (!content && !imageUrl && !fileUrl) {
      throw new BadRequestException('Message must have content, imageUrl, or fileUrl');
    }

    console.log(`📨 [createMessage] User ${userId} sending message to conversation ${conversationId}`);

    // Konuşma ve katılımcıları kontrol et
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
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      console.error(`❌ [createMessage] Conversation ${conversationId} not found`);
      throw new NotFoundException('Conversation not found');
    }

    const hasAccess = conversation.participants.some((p) => p.userId === userId);
    if (!hasAccess) {
      console.error(`❌ [createMessage] User ${userId} has no access to conversation ${conversationId}`);
      throw new ForbiddenException('Access denied');
    }

    // 🕐 SON GÖRÜLME GÜNCELLEMESİ
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          lastSeen: new Date(),
          isOnline: true,
        },
      });
      console.log(`✅ [createMessage] Updated lastSeen for user ${userId}`);
    } catch (error) {
      console.warn(`⚠️ [createMessage] Failed to update lastSeen:`, error);
    }

    // Mesaj bağlamını conversation'dan al
    const conversationAny = conversation as any;
    const messageContext = conversationAny.context || 'DIRECT';
    const messageJobId = conversationAny.jobId || null;
    const messageApplicationId = conversationAny.applicationId || null;

    // Mesaj verilerini hazırla
    const messageData: any = {
      conversationId,
      senderId: userId,
      content: content || null,
      imageUrl: imageUrl || null,
      fileUrl: fileUrl || null,
      fileName: fileName || null,
      fileType: fileType || null,
      isDeleted: false,
      read: false,
    };

    if (messageContext) {
      messageData.context = messageContext;
    }
    if (messageJobId) {
      messageData.jobId = messageJobId;
    }
    if (messageApplicationId) {
      messageData.applicationId = messageApplicationId;
    }

    // Mesajı veritabanına kaydet
    const message = await this.prisma.message.create({
      data: messageData,
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true,
            fullName: true,
          },
        },
      },
    });

    console.log(`✅ [createMessage] Message created: ${message.id}`);

    // Conversation metadata güncelle
    const lastMessageText = message.content ?? (message.imageUrl ? '📷 Fotoğraf' : (message.fileUrl ? '📎 Dosya' : 'Yeni mesaj'));
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessage: lastMessageText,
        updatedAt: new Date(),
      },
    });

    console.log(`✅ [createMessage] Conversation ${conversationId} metadata updated`);

    // Socket event gönder (eğer gateway varsa ve çalışıyorsa)
    // ⚠️ Vercel'de socket çalışmaz, bu yüzden opsiyonel
    if (this.chatGateway && typeof (this.chatGateway as any).broadcastMessageImmediately === 'function') {
      try {
        (this.chatGateway as any).broadcastMessageImmediately(message, conversation, userId, conversationId);
        console.log(`📡 [createMessage] Broadcast message via socket`);
      } catch (error) {
        // Socket event gönderilemezse sessizce devam et (REST API fallback var)
        console.warn('[ChatService] Failed to broadcast message via socket:', error);
      }
    }

    // Alıcıya anlık bildirim: mesaj oluşturulduğunda notification oluştur ve socket ile gönder (refresh ile değil)
    const recipient = conversation.participants.find((p) => p.userId !== userId);
    if (recipient) {
      this.notificationsService.createNotificationSync({
        userId: recipient.userId,
        type: 'message',
        fromUserId: userId,
        targetPath: '/messages',
        targetUrl: '/messages',
      }).catch((err) => {
        console.warn('[ChatService] Message notification failed:', err?.message || err);
      });
    }

    return message;
  }

  private normalizeChatUserId(id: string): string {
    return String(id ?? '').trim();
  }

  /**
   * Tam olarak iki katılımcılı, userA–userB çiftine ait mevcut konuşmayı bulur.
   * Birden fazlaysa: önce context DIRECT, sonra en eski createdAt.
   */
  private pickCanonicalDirectPairFromCandidates<
    T extends { participants: { userId: string }[]; createdAt: Date; context?: string },
  >(candidates: T[], a: string, b: string): T | null {
    const pairMatches = candidates.filter((conv) => {
      const parts = conv.participants;
      if (parts.length !== 2) return false;
      const ids = new Set(parts.map((p) => this.normalizeChatUserId(p.userId)));
      return ids.size === 2 && ids.has(a) && ids.has(b);
    });

    if (pairMatches.length === 0) {
      return null;
    }

    pairMatches.sort((x, y) => {
      const xDirect = (x as { context?: string }).context === 'DIRECT';
      const yDirect = (y as { context?: string }).context === 'DIRECT';
      if (xDirect !== yDirect) return xDirect ? -1 : 1;
      return new Date(x.createdAt).getTime() - new Date(y.createdAt).getTime();
    });

    return pairMatches[0];
  }

  private async findExistingDirectPairConversationForClient(
    db: Pick<PrismaService, 'conversation'>,
    userA: string,
    userB: string,
  ) {
    const a = this.normalizeChatUserId(userA);
    const b = this.normalizeChatUserId(userB);
    if (!a || !b || a === b) {
      return null;
    }

    const candidates = await db.conversation.findMany({
      where: {
        AND: [
          { participants: { some: { userId: a } } },
          { participants: { some: { userId: b } } },
        ],
      },
      include: { participants: true },
      orderBy: { createdAt: 'asc' },
    });

    return this.pickCanonicalDirectPairFromCandidates(candidates, a, b);
  }

  private async findExistingDirectPairConversation(userA: string, userB: string) {
    return this.findExistingDirectPairConversationForClient(this.prisma, userA, userB);
  }

  private conversationFullInclude() {
    return {
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
    } as const;
  }

  private async ensureUserConversationsForParticipants(
    db: Pick<PrismaService, 'userConversation'>,
    conversationId: string,
    participantIds: string[],
  ) {
    await Promise.all(
      participantIds.map(async (participantId) => {
        try {
          await db.userConversation.upsert({
            where: {
              userId_conversationId: {
                userId: participantId,
                conversationId,
              },
            },
            create: {
              userId: participantId,
              conversationId,
              isDeleted: false,
            },
            update: {
              isDeleted: false,
            },
          });
        } catch (error: any) {
          if (error?.code !== 'P2002') {
            console.error(
              `❌ [ChatService] ensureUserConversationsForParticipants failed for ${participantId}:`,
              error?.message,
            );
          }
        }
      }),
    );
  }

  /**
   * İki kullanıcı arasında tek DIRECT thread: varsa döner + UserConversation garanti, yoksa transaction içinde çift kontrol ile oluşturur.
   */
  async findOrCreateDirectConversation(userA: string, userB: string) {
    const a = this.normalizeChatUserId(userA);
    const b = this.normalizeChatUserId(userB);
    if (!a || !b) {
      throw new BadRequestException('Geçersiz kullanıcı');
    }
    if (a === b) {
      throw new BadRequestException('Kendinize mesaj akışı açılamaz');
    }

    const fullInc = this.conversationFullInclude();

    return this.prisma.$transaction(async (tx) => {
      let existing = await this.findExistingDirectPairConversationForClient(tx, a, b);
      if (existing) {
        await this.ensureUserConversationsForParticipants(tx, existing.id, [a, b]);
        return tx.conversation.findUnique({
          where: { id: existing.id },
          include: fullInc,
        });
      }

      existing = await this.findExistingDirectPairConversationForClient(tx, a, b);
      if (existing) {
        await this.ensureUserConversationsForParticipants(tx, existing.id, [a, b]);
        return tx.conversation.findUnique({
          where: { id: existing.id },
          include: fullInc,
        });
      }

      const conversationData: any = {
        context: 'DIRECT',
        participants: {
          create: [{ userId: a }, { userId: b }],
        },
      };

      // Nested participants.create zaten UserConversation satırlarını oluşturur.
      // Aynı tx içinde tekrar userConversation.create duplicate key ile Mongo transaction'ı abort eder.
      const created = await tx.conversation.create({
        data: conversationData,
        include: fullInc,
      });

      return created;
    });
  }

  async createConversation(userId: string, participantIds: string[], context?: 'DIRECT' | 'JOB_APPLICATION', jobId?: string, applicationId?: string) {
    const normUserId = this.normalizeChatUserId(userId);
    const validParticipantIds = participantIds
      .filter((id) => id && typeof id === 'string' && this.normalizeChatUserId(id) !== '')
      .map((id) => this.normalizeChatUserId(id));

    if (!normUserId) {
      throw new Error('Invalid userId');
    }

    const allParticipants = [normUserId, ...validParticipantIds.filter((id) => id !== normUserId)];

    if (allParticipants.length < 2) {
      throw new Error('At least 2 participants required');
    }

    const sortedParticipantIds = [...allParticipants].sort();

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
        const convParticipantIds = convAny.participants
          .map((p: any) => this.normalizeChatUserId(p.userId))
          .sort();
        if (
          convParticipantIds.length === sortedParticipantIds.length &&
          convParticipantIds.every((id, index) => id === sortedParticipantIds[index])
        ) {
          existingConversation = conv;
          break;
        }
      }
    } else if ((context === 'DIRECT' || !context) && sortedParticipantIds.length === 2) {
      const conv = await this.findOrCreateDirectConversation(sortedParticipantIds[0], sortedParticipantIds[1]);
      console.log(`✅ [ChatService] findOrCreateDirectConversation -> ${conv?.id}`);
      return conv;
    } else if (context === 'DIRECT' || !context) {
      const allUserConversations = await this.prisma.conversation.findMany({
        where: {
          participants: {
            some: {
              userId: normUserId,
            },
          },
        },
        include: {
          participants: true,
        },
      });

      for (const conv of allUserConversations) {
        const convAny = conv as any;
        const convParticipantIds = convAny.participants
          .map((p: any) => this.normalizeChatUserId(p.userId))
          .sort();

        if (
          convParticipantIds.length === sortedParticipantIds.length &&
          convParticipantIds.every((id, index) => id === sortedParticipantIds[index])
        ) {
          existingConversation = conv;
          console.log(
            `✅ [ChatService] Found existing DIRECT conversation: ${conv.id} (multi-participant match)`,
          );
          break;
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

    const updated = await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        read: false,
      },
      data: {
        read: true,
      },
    });

    // Gönderene anlık "görüldü" bildirimi (REST ile açıldığında da socket ile güncellenir)
    await this.chatGateway.markMessagesAsRead(conversationId, userId);

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

