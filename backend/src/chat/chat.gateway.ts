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

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: (origin, callback) => {
      const isDevelopment = process.env.NODE_ENV !== 'production';
      const allowedOrigins = isDevelopment
        ? [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:3002',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:3001',
            'http://127.0.0.1:3002',
          ]
        : [process.env.FRONTEND_URL || 'http://localhost:3000'];
      
      if (!origin || isDevelopment || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  },
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
      if (otherParticipant) {
        const isBlocked = await this.blocksService.isBlocked(userId, otherParticipant.userId);
        if (isBlocked) {
          return { error: 'Cannot send message. User is blocked.' };
        }
      }

      // Mesajı veritabanına kaydet
      const message = await this.prisma.message.create({
        data: {
          conversationId: data.conversationId,
          senderId: userId,
          content: data.content || null,
          imageUrl: data.imageUrl || null,
          fileUrl: data.fileUrl || null,
          fileName: data.fileName || null,
          fileType: data.fileType || null,
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
      });

      // Konuşmayı güncelle (updatedAt)
      await this.prisma.conversation.update({
        where: { id: data.conversationId },
        data: { updatedAt: new Date() },
      });

      // ✅ Yeni mesaj geldiğinde silinmiş sohbetleri geri getir
      await this.prisma.userConversation.updateMany({
        where: {
          conversationId: data.conversationId,
          isDeleted: true,
        },
        data: {
          isDeleted: false,
        },
      });

      // Mesajı aynı konuşmadaki tüm kullanıcılara gönder
      this.server.to(`conversation_${data.conversationId}`).emit('receive_message', message);

      // Eğer kullanıcılar sohbette değilse, kişisel bildirim gönder
      conversation.participants.forEach((participant) => {
        if (participant.userId !== userId) {
          this.server.to(`user_${participant.userId}`).emit('new_message', {
            conversationId: data.conversationId,
            message,
          });
        }
      });

      return { success: true, message };
    } catch (error) {
      return { error: error.message };
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

