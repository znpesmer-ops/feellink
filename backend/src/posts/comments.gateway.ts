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
import { Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@WebSocketGateway({
  namespace: '/comments',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class CommentsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
  ) {}

  afterInit(server: Server) {
    console.log('Comments WebSocket Gateway initialized');
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

      console.log(`✅ Comments: ${userId} connected`);
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log('❌ Comments: Client disconnected');
  }

  @SubscribeMessage('joinPostRoom')
  handleJoinPostRoom(@MessageBody() postId: string, @ConnectedSocket() client: Socket) {
    const room = `post_${postId}`;
    client.join(room);
    console.log(`📝 Client joined room: ${room}`);
  }

  @SubscribeMessage('leavePostRoom')
  handleLeavePostRoom(@MessageBody() postId: string, @ConnectedSocket() client: Socket) {
    const room = `post_${postId}`;
    client.leave(room);
    console.log(`📝 Client left room: ${room}`);
  }

  @SubscribeMessage('newComment')
  async handleNewComment(
    @MessageBody() data: { postId: string; comment: any; userId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `post_${data.postId}`;
    
    // Odadaki tüm kullanıcılara (gönderen dahil) yorumu gönder
    // Frontend'de çift eklemeyi önlemek için ID kontrolü var
    this.server.to(room).emit('newComment', data.comment);
    console.log(`💬 New comment in room: ${room}`);

    // 🔔 Yorum bildirimi gönder (yazı sahibine)
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
      if (token) {
        const payload = this.jwtService.verify(token);
        const commenterId = payload.userId;

        // Post sahibini bul
        const post = await this.prisma.post.findUnique({
          where: { id: data.postId },
          select: { userId: true },
        });

        // Eğer yorum yapan post sahibi değilse bildirim gönder
        if (post && post.userId !== commenterId) {
          // Bildirimi veritabanına kaydet ve socket ile gönder
          await this.notificationsService.createNotification({
            userId: post.userId,
            type: 'comment',
            fromUserId: commenterId,
            postId: data.postId,
            commentId: data.comment?.id,
          });

          console.log(`🔔 Comment notification sent to post owner: ${post.userId}`);
        }
      }
    } catch (error) {
      console.error('Error sending comment notification:', error);
    }

    return data.comment;
  }
}

