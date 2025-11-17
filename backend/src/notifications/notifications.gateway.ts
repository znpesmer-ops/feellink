import { WebSocketGateway, WebSocketServer, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

@WebSocketGateway({
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
export class NotificationsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets: Map<string, Socket> = new Map();

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  afterInit(server: Server) {
    console.log('WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
      
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.userId;

      this.userSockets.set(userId, client);
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // Find and remove the socket
    for (const [userId, socket] of this.userSockets.entries()) {
      if (socket === client) {
        this.userSockets.delete(userId);
        break;
      }
    }
  }

  notifyUser(userId: string, notification: any) {
    const socket = this.userSockets.get(userId);
    if (socket) {
      socket.emit('notification', notification);
    }
  }

  // Helper method to send notification to user
  async sendNotificationToUser(userId: string, notificationData: any) {
    const socket = this.userSockets.get(userId);
    if (socket) {
      socket.emit('notification', notificationData);
      return true;
    }
    return false;
  }

  // Helper method to notify user that a notification was read
  notifyNotificationRead(userId: string, notificationId: string) {
    const socket = this.userSockets.get(userId);
    if (socket) {
      socket.emit('notificationRead', {
        notificationId,
        userId,
      });
      console.log(`📡 Notification read event sent to user ${userId} for notification ${notificationId}`);
    }
  }

  // 🎟️ Bilet güncelleme eventi gönder (analytics için)
  emitTicketUpdate(eventId: string, ticketData: any) {
    // Event sahibine bildirim gönder
    this.server.emit(`ticket_update:${eventId}`, ticketData);
    console.log(`🎫 Ticket update event emitted for event ${eventId}`);
  }

  // 🏆 Ziyaretçi güncelleme eventi gönder (analytics için)
  emitVisitorUpdate(corporateUserId: string, visitorsData: any[]) {
    // Corporate user'a ziyaretçi listesi güncellemesi gönder
    this.server.emit(`visitor:update:${corporateUserId}`, visitorsData);
    console.log(`🏆 Visitor update event emitted for corporate user ${corporateUserId}`);
  }
}

