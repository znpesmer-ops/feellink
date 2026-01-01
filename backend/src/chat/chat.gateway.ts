import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { BlocksService } from '../blocks/blocks.service';
import { FollowService } from '../follow/follow.service';

import { getWebSocketCorsConfig } from '../common/utils/websocket-cors.util';

@WebSocketGateway({
  namespace: '/chat',
  ...getWebSocketCorsConfig(),
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets: Map<string, string> = new Map(); // userId -> socketId
  private socketToUser: Map<string, string> = new Map(); // socketId -> userId

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private blocksService: BlocksService,
    private followService: FollowService,
  ) {}

  afterInit(server: Server) {
    console.log('Chat WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
      
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.userId;

      this.userSockets.set(userId, client.id);
      this.socketToUser.set(client.id, userId);

      // Kullanıcıyı kendi odasına ekle (kişisel bildirimler için)
      client.join(`user_${userId}`);

      // Kullanıcıyı çevrim içi olarak işaretle
      await this.prisma.user.update({
        where: { id: userId },
        data: { isOnline: true },
      });

      console.log(`✅ ${userId} çevrim içi`);

      // Tüm kullanıcılara durum güncellemesi gönder
      this.broadcastUserStatus(userId, true);
    } catch (error) {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = this.socketToUser.get(client.id);
    if (userId) {
      this.userSockets.delete(userId);
      this.socketToUser.delete(client.id);

      // Kullanıcıyı çevrim dışı olarak işaretle ve son görülme zamanını güncelle
      await this.prisma.user.update({
        where: { id: userId },
        data: { 
          isOnline: false,
          lastSeen: new Date(),
        },
      });

      console.log(`❌ ${userId} çevrim dışı`);

      // Tüm kullanıcılara durum güncellemesi gönder
      this.broadcastUserStatus(userId, false);
    }
  }

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.socketToUser.get(client.id);
    if (!userId) return { error: 'Unauthorized' };

    // Kullanıcının bu konuşmaya erişim yetkisi var mı kontrol et
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: data.conversationId },
      include: { participants: true },
    });

    if (!conversation) {
      return { error: 'Conversation not found' };
    }

    const hasAccess = conversation.participants.some((p) => p.userId === userId);
    if (!hasAccess) {
      return { error: 'Access denied' };
    }

    client.join(`conversation_${data.conversationId}`);
    return { success: true, conversationId: data.conversationId };
  }

  @SubscribeMessage('leave_conversation')
  async handleLeaveConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`conversation_${data.conversationId}`);
    return { success: true, conversationId: data.conversationId };
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody()
    data: { conversationId: string; content?: string; imageUrl?: string; fileUrl?: string; fileName?: string; fileType?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.socketToUser.get(client.id);
    if (!userId) {
      return { error: 'Unauthorized' };
    }

    // En az content, imageUrl veya fileUrl biri olmalı
    if (!data.content && !data.imageUrl && !data.fileUrl) {
      return { error: 'Message must have content, imageUrl, or fileUrl' };
    }

    try {
      // Konuşma ve katılımcıları kontrol et
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: data.conversationId },
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
        return { error: 'Conversation not found' };
      }

      const hasAccess = conversation.participants.some((p) => p.userId === userId);
      if (!hasAccess) {
        return { error: 'Access denied' };
      }

      // Block kontrolü: Karşı tarafı engellemiş mi veya engellenmiş mi kontrol et
      const otherParticipant = conversation.participants.find((p) => p.userId !== userId);
      if (!otherParticipant) {
        return { error: 'Other participant not found' };
      }

      const isBlocked = await this.blocksService.isBlocked(userId, otherParticipant.userId);
      if (isBlocked) {
        return { error: 'Cannot send message. User is blocked.' };
      }

      // 🔥 INSTAGRAM MANTIĞI: Gizli hesap kontrolü ve mesaj isteği
      // Alıcının hesap bilgilerini al
      const recipient = await this.prisma.user.findUnique({
        where: { id: otherParticipant.userId },
        select: { id: true, isPrivate: true },
      });

      let isRequest = false;
      if (recipient?.isPrivate) {
        // Gizli hesap ise, gönderen takipçi mi kontrol et
        const isFollowing = await this.prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: userId,
              followingId: recipient.id,
            },
          },
        });
        
        // Eğer takipçi değilse, mesaj isteği olarak işaretle
        if (!isFollowing) {
          isRequest = true;
          console.log(`📩 [ChatGateway] Message marked as request: sender=${userId}, recipient=${recipient.id} (private account, not following)`);
        }
      }

      // ✅ Mesaj bağlamını conversation'dan al (context, jobId, applicationId)
      // Prisma client generate edilene kadar type assertion kullan
      const conversationAny = conversation as any
      const messageContext = conversationAny.context || 'DIRECT'
      const messageJobId = conversationAny.jobId || null
      const messageApplicationId = conversationAny.applicationId || null

      // Mesajı veritabanına kaydet (kalıcı olması için)
      // Prisma client generate edilene kadar type assertion kullan
      const messageData: any = {
        conversationId: data.conversationId,
        senderId: userId,
        content: data.content || null,
        imageUrl: data.imageUrl || null,
        fileUrl: data.fileUrl || null,
        fileName: data.fileName || null,
        fileType: data.fileType || null,
        isRequest: isRequest, // 🔥 Instagram tarzı mesaj isteği
        isDeleted: false, // 🔥 KRİTİK: Mesaj kalıcı olmalı
        read: false, // İlk başta okunmamış
      }
      
      // Prisma client generate edilene kadar context, jobId ve applicationId'yi optional olarak ekle
      if (messageContext) {
        messageData.context = messageContext
      }
      if (messageJobId) {
        messageData.jobId = messageJobId
      }
      if (messageApplicationId) {
        messageData.applicationId = messageApplicationId
      }
      
      const message = await this.prisma.message.create({
        data: messageData,
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
      });
      
      console.log(`✅ [ChatGateway] Message created in DB: ${message.id}, conversation: ${data.conversationId}, sender: ${userId}`);

      // 🔥 KRİTİK: Socket event'lerini HEMEN gönder (gecikme yok - anlık)
      // DB güncellemelerini arka planda yap, socket event'lerini önce gönder
      this.broadcastMessageImmediately(message, conversation, userId, data.conversationId);

      // ✅ KRİTİK: Conversation metadata güncelle (sol panel için - lastMessage)
      // MongoDB'de manuel yapmak ZORUNLU (Postgres otomatik yapıyordu)
      // await ile yapmalıyız - lastMessage her zaman güncel olmalı
      const lastMessageText = message.content ?? (message.imageUrl ? '📷 Fotoğraf' : (message.fileUrl ? '📎 Dosya' : 'Yeni mesaj'));
      await this.prisma.conversation.update({
        where: { id: data.conversationId },
        data: {
          lastMessage: lastMessageText,
          updatedAt: new Date(),
        },
      });
      console.log(`✅ [ChatGateway] Conversation lastMessage updated: ${lastMessageText.substring(0, 50)}...`);

      // ✅ ARKA PLANDA: Receiver için conversation kaydı MUTLAKA oluştur (Instagram gibi)
      // Sadece receiver için silinmiş sohbeti geri getir (sender zaten mesaj gönderiyor, conversation'ı silmemiş demektir)
      const receiverParticipant = conversation.participants.find((p) => p.userId !== userId);
      if (receiverParticipant) {
        this.prisma.userConversation.upsert({
          where: {
            userId_conversationId: {
              userId: receiverParticipant.userId,
              conversationId: data.conversationId,
            },
          },
          create: {
            userId: receiverParticipant.userId,
            conversationId: data.conversationId,
            isDeleted: false,
          },
          update: {
            isDeleted: false, // ✅ Sadece receiver için silinmiş sohbeti geri getir
          },
        }).then(() => {
          console.log(`✅ [ChatGateway] UserConversation ensured for receiver: ${receiverParticipant.userId}`);
        }).catch(err => {
          console.error(`❌ [ChatGateway] Failed to create UserConversation for receiver: ${err.message}`);
        });
      }

      // 🔥 ARKA PLANDA: Sender için de UserConversation kaydı oluştur (ama isDeleted'i değiştirme)
      // Sender zaten mesaj gönderiyor, conversation'ı silmemiş demektir
      this.prisma.userConversation.upsert({
        where: {
          userId_conversationId: {
            userId: userId,
            conversationId: data.conversationId,
          },
        },
        create: {
          userId: userId,
          conversationId: data.conversationId,
          isDeleted: false,
        },
        update: {
          // ✅ Sender için isDeleted'i değiştirme - eğer silmişse silinmiş kalsın
          // Sadece receiver için geri getir
        },
      }).then(() => {
        console.log(`✅ [ChatGateway] UserConversation ensured for sender: ${userId}`);
      }).catch(err => {
        console.error(`❌ [ChatGateway] Failed to create UserConversation for sender: ${err.message}`);
      });

      // 🔥 ARKA PLANDA: updatedConversation'ı hazırla (conversation_updated event'i için)
      this.prepareAndSendConversationUpdate(data.conversationId, message).catch(err => {
        console.error(`❌ [ChatGateway] Failed to prepare conversation update: ${err.message}`);
      });

      return { success: true, message };
    } catch (error) {
      return { error: error.message };
    }
  }

  // 🔥 KRİTİK: Mesajı ANINDA gönder (gecikme yok)
  private async broadcastMessageImmediately(
    message: any,
    conversation: any,
    userId: string,
    conversationId: string
  ) {
    // 🔥 KRİTİK: Mesajı TÜM katılımcılara gönder (garantili - çoklu yöntem)
    console.log(`📤 [ChatGateway] Broadcasting message ${message.id} to conversation ${conversationId} (IMMEDIATE)`);
    console.log(`📤 [ChatGateway] Sender: ${userId}`);
    console.log(`📤 [ChatGateway] Participants:`, conversation.participants.map((p: any) => ({ userId: p.userId, username: p.user?.username })));
    console.log(`📤 [ChatGateway] Active sockets:`, Array.from(this.userSockets.entries()).map(([uid, sid]) => ({ userId: uid, socketId: sid })));
    
    // 🔥 KRİTİK: Conversation objesini hazırla (new_message event'i için)
    // Prisma client generate edilene kadar type assertion kullan
    const conversationAny = conversation as any
    const updatedConversation = {
      id: conversation.id,
      createdAt: conversation.createdAt,
      updatedAt: new Date(),
      lastMessage: message.content ?? (message.imageUrl ? '📷 Fotoğraf' : (message.fileUrl ? '📎 Dosya' : 'Yeni mesaj')),
      context: conversationAny.context || 'DIRECT', // ✅ Context bilgisi eklendi
      jobId: conversationAny.jobId || null, // ✅ JobId bilgisi eklendi
      applicationId: conversationAny.applicationId || null, // ✅ ApplicationId bilgisi eklendi
      participants: conversation.participants.map((p: any) => ({
        id: p.id || p.userId, // UserConversation id'si
        userId: p.userId,
        user: p.user,
      })),
    };
    
    // 🔥 1. Conversation room'una gönder (join olanlar için)
    this.server.to(`conversation_${conversationId}`).emit('receive_message', message);
    this.server.to(`conversation_${conversationId}`).emit('new_message', {
      conversationId: conversationId,
      message,
      conversation: updatedConversation, // ✅ Conversation objesi eklendi
    });
    console.log(`📤 [ChatGateway] Sent to conversation room: conversation_${conversationId}`);
    
    // 🔥 2. Her katılımcıya GARANTİLİ gönderim (3 yöntemle)
    conversation.participants.forEach((participant: any) => {
      const participantUserId = participant.userId;
      const participantSocketId = this.userSockets.get(participantUserId);
      
      // Receiver için (sender hariç)
      if (participantUserId !== userId) {
        console.log(`📤 [ChatGateway] Sending to RECEIVER: ${participantUserId}, Socket ID: ${participantSocketId || 'NOT FOUND'}`);
        
        // ✅ KRİTİK: Receiver'a MUTLAKA gönder (3 yöntemle garantili)
        // YÖNTEM 1: Socket ID'ye direkt gönder (en hızlı)
        if (participantSocketId) {
          this.server.to(participantSocketId).emit('receive_message', message);
          this.server.to(participantSocketId).emit('new_message', {
            conversationId: conversationId,
            message,
            conversation: updatedConversation,
          });
          this.server.to(participantSocketId).emit('conversation_updated', updatedConversation);
          console.log(`✅ [ChatGateway] Message sent to receiver socket ID: ${participantSocketId} (userId: ${participantUserId})`);
        } else {
          console.warn(`⚠️ [ChatGateway] Receiver socket ID not found for userId: ${participantUserId} - using user room fallback`);
        }
        
        // YÖNTEM 2: User room'a gönder (her zaman aktif - reconnect olduğunda alır)
        // ✅ KRİTİK: User room'a MUTLAKA gönder (receiver bağlı olmasa bile reconnect olduğunda alır)
        this.server.to(`user_${participantUserId}`).emit('receive_message', message);
        this.server.to(`user_${participantUserId}`).emit('new_message', {
          conversationId: conversationId,
          message,
          conversation: updatedConversation,
        });
        this.server.to(`user_${participantUserId}`).emit('conversation_updated', updatedConversation);
        console.log(`✅ [ChatGateway] Message sent to receiver user room: user_${participantUserId}`);
        
        // YÖNTEM 3: Conversation room'a gönder (receiver join olmuşsa alır)
        this.server.to(`conversation_${conversationId}`).emit('receive_message', message);
        this.server.to(`conversation_${conversationId}`).emit('new_message', {
          conversationId: conversationId,
          message,
          conversation: updatedConversation,
        });
        this.server.to(`conversation_${conversationId}`).emit('conversation_updated', updatedConversation);
        console.log(`✅ [ChatGateway] Message sent to conversation room: conversation_${conversationId}`);
      } else {
        // Sender için de gönder (optimistic update için)
        if (participantSocketId) {
          this.server.to(participantSocketId).emit('receive_message', message);
          this.server.to(participantSocketId).emit('new_message', {
            conversationId: conversationId,
            message,
            conversation: updatedConversation,
          });
          console.log(`✅ [ChatGateway] Message sent to sender socket ID: ${participantSocketId}`);
        }
      }
    });

    console.log(`✅ [ChatGateway] Message ${message.id} broadcasted to all participants of conversation ${conversationId} (IMMEDIATE)`);
  }

  // 🔥 ARKA PLANDA: Conversation update'i hazırla ve gönder
  private async prepareAndSendConversationUpdate(conversationId: string, message: any): Promise<void> {
    try {
      const updatedConversation = await this.prisma.conversation.findUnique({
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
      });

      // Conversation update event'ini gönder
      if (updatedConversation) {
        updatedConversation.participants.forEach((participant: any) => {
          const participantSocketId = this.userSockets.get(participant.userId);
          if (participantSocketId) {
            this.server.to(participantSocketId).emit('conversation_updated', updatedConversation);
          }
          this.server.to(`user_${participant.userId}`).emit('conversation_updated', updatedConversation);
        });
        console.log(`✅ [ChatGateway] Conversation update sent for conversation ${conversationId}`);
      }
    } catch (error: any) {
      console.error(`❌ [ChatGateway] Failed to prepare conversation update: ${error.message}`);
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @MessageBody() data: { conversationId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.socketToUser.get(client.id);
    if (!userId) return;

    // Diğer katılımcılara typing durumunu gönder
    client.to(`conversation_${data.conversationId}`).emit('user_typing', {
      userId,
      conversationId: data.conversationId,
      isTyping: data.isTyping,
    });
  }

  @SubscribeMessage('typing_start')
  async handleTypingStart(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.socketToUser.get(client.id);
    if (!userId) return { error: 'Unauthorized' };

    try {
      // Konuşmayı kontrol et
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: data.conversationId },
        include: { participants: true },
      });

      if (!conversation) {
        return { error: 'Conversation not found' };
      }

      const hasAccess = conversation.participants.some((p) => p.userId === userId);
      if (!hasAccess) {
        return { error: 'Access denied' };
      }

      // Diğer katılımcılara typing_start olayını gönder
      conversation.participants.forEach((participant) => {
        if (participant.userId !== userId) {
          const targetSocketId = this.userSockets.get(participant.userId);
          if (targetSocketId) {
            this.server.to(targetSocketId).emit('typing_start', {
              conversationId: data.conversationId,
              userId,
            });
          }
        }
      });

      return { success: true };
    } catch (error) {
      return { error: error.message };
    }
  }

  @SubscribeMessage('typing_stop')
  async handleTypingStop(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.socketToUser.get(client.id);
    if (!userId) return { error: 'Unauthorized' };

    try {
      // Konuşmayı kontrol et
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: data.conversationId },
        include: { participants: true },
      });

      if (!conversation) {
        return { error: 'Conversation not found' };
      }

      const hasAccess = conversation.participants.some((p) => p.userId === userId);
      if (!hasAccess) {
        return { error: 'Access denied' };
      }

      // Diğer katılımcılara typing_stop olayını gönder
      conversation.participants.forEach((participant) => {
        if (participant.userId !== userId) {
          const targetSocketId = this.userSockets.get(participant.userId);
          if (targetSocketId) {
            this.server.to(targetSocketId).emit('typing_stop', {
              conversationId: data.conversationId,
              userId,
            });
          }
        }
      });

      return { success: true };
    } catch (error) {
      return { error: error.message };
    }
  }

  @SubscribeMessage('mark_message_read')
  async handleMarkMessageRead(
    @MessageBody() data: { messageId: string; conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.socketToUser.get(client.id);
    if (!userId) {
      return { error: 'Unauthorized' };
    }

    try {
      // Mesajı kontrol et
      const message = await this.prisma.message.findUnique({
        where: { id: data.messageId },
        include: {
          conversation: {
            include: { participants: true },
          },
        },
      });

      if (!message) {
        return { error: 'Message not found' };
      }

      // Erişim kontrolü
      const hasAccess = message.conversation.participants.some((p) => p.userId === userId);
      if (!hasAccess) {
        return { error: 'Access denied' };
      }

      // Sadece başkasının mesajını okundu yapabilirsin
      if (message.senderId === userId) {
        return { error: 'Cannot mark own message as read' };
      }

      // Mesajı okundu olarak işaretle
      const updatedMessage = await this.prisma.message.update({
        where: { id: data.messageId },
        data: { read: true },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
      });

      // Gönderene okundu bilgisini bildir
      const senderSocketId = this.userSockets.get(message.senderId);
      if (senderSocketId) {
        this.server.to(senderSocketId).emit('message_read_update', {
          messageId: data.messageId,
          conversationId: data.conversationId,
          readBy: userId,
        });
      }

      return { success: true, message: updatedMessage };
    } catch (error) {
      return { error: error.message };
    }
  }

  // Mesajları okundu olarak işaretleme için yardımcı method
  async markMessagesAsRead(conversationId: string, userId: string) {
    const updatedCount = await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        read: false,
      },
      data: {
        read: true,
      },
    });

    // Okundu bilgisini diğer kullanıcılara bildir
    this.server.to(`conversation_${conversationId}`).emit('messages_read', {
      conversationId,
      userId,
      count: updatedCount.count,
    });

    return updatedCount;
  }

  // Online kullanıcıları kontrol etme
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  // Kullanıcıya direkt mesaj gönderme (bildirimler için)
  sendToUser(userId: string, event: string, data: any) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
    }
  }

  // Mesaj düzenlendiğinde broadcast et
  async broadcastMessageEdited(message: any) {
    // Mesajın conversation'ındaki tüm katılımcılara gönder
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: message.conversationId },
      include: { participants: true },
    });

    if (conversation) {
      this.server.to(`conversation_${message.conversationId}`).emit('messageEdited', message);
    }
  }

  // Mesaj silindiğinde broadcast et
  async broadcastMessageDeleted(messageId: string, conversationId: string) {
    this.server.to(`conversation_${conversationId}`).emit('messageDeleted', {
      id: messageId,
      conversationId,
    });
  }

  // Kullanıcı durum güncellemesini tüm client'lara yayınla
  private async broadcastUserStatus(userId: string, isOnline: boolean) {
    // Veritabanından güncel kullanıcı bilgisini al
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isOnline: true, lastSeen: true },
    });

    if (user) {
      this.server.emit('user_status_update', {
        userId,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
      });
    }
  }

  // Aktif kullanıcı listesini gönder
  @SubscribeMessage('get_active_users')
  async handleGetActiveUsers(@ConnectedSocket() client: Socket) {
    const activeUserIds = Array.from(this.userSockets.keys());
    
    // Her aktif kullanıcının detaylı bilgisini gönder
    const userStatuses = await Promise.all(
      activeUserIds.map(async (userId) => {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, isOnline: true, lastSeen: true },
        });
        return user ? { userId: user.id, isOnline: user.isOnline, lastSeen: user.lastSeen } : null;
      })
    );
    
    const validUsers = userStatuses.filter((u) => u !== null);
    
    // Aktif kullanıcı ID listesini gönder
    client.emit('active_users_list', validUsers.map((u) => u.userId));
    
    // Her kullanıcı için ayrı status update gönder (detaylı bilgi ile)
    validUsers.forEach((u) => {
      client.emit('user_status_update', {
        userId: u.userId,
        isOnline: u.isOnline,
        lastSeen: u.lastSeen,
      });
    });
  }
}

