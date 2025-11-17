import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Injectable, Logger } from '@nestjs/common';
import { AdminService } from './admin.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@WebSocketGateway({
  namespace: '/admin',
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
@Injectable()
export class AdminGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AdminGateway.name);
  private adminSockets: Map<string, Socket> = new Map();

  constructor(
    private jwtService: JwtService,
    private adminService: AdminService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Admin WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.userId;

      // Check if user is admin (you might want to verify from DB)
      // For now, we'll trust the JWT and let AdminGuard handle it on HTTP requests
      this.adminSockets.set(userId, client);
      this.logger.log(`Admin connected: ${userId}`);

      // Send initial summary
      const summary = await this.adminService.getSummary();
      client.emit('admin:metrics', summary);
    } catch (error) {
      this.logger.error('Admin connection error:', error);
      client.disconnect();
    }
  }

  // Emit visitor location to admin clients
  emitVisitorLocation(data: {
    userId: string;
    country: string;
    city: string;
    lat: number;
    lon: number;
    timestamp: string;
    username?: string;
  }) {
    this.server.emit('visitor:location', data);
  }

  handleDisconnect(client: Socket) {
    for (const [userId, socket] of this.adminSockets.entries()) {
      if (socket === client) {
        this.adminSockets.delete(userId);
        this.logger.log(`Admin disconnected: ${userId}`);
        break;
      }
    }
  }

  // Broadcast summary every 10 seconds
  @Cron('*/10 * * * * *') // Every 10 seconds
  async broadcastMetrics() {
    try {
      const summary = await this.adminService.getSummary();
      this.server.emit('admin:metrics', summary);
    } catch (error) {
      this.logger.error('Error broadcasting metrics:', error);
    }
  }

  // Broadcast analytics every 30 seconds
  @Cron('*/30 * * * * *') // Every 30 seconds
  async broadcastAnalytics() {
    try {
      const analytics = await this.adminService.getAnalytics();
      this.server.emit('admin:analytics', analytics);
    } catch (error) {
      this.logger.error('Error broadcasting analytics:', error);
    }
  }

  // Emit moderation event
  emitModerationEvent(event: {
    type: string;
    target: string;
    action: string;
    data?: any;
  }) {
    this.server.emit('admin:moderation', event);
  }

  // Emit system event
  emitSystemEvent(event: { type: string; message: string; data?: any }) {
    this.server.emit('admin:system', event);
  }
}

