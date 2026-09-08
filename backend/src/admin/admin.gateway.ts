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
import { Cron } from '@nestjs/schedule';

import { getWebSocketCorsConfig } from '../common/utils/websocket-cors.util';
import { isVercelServerlessRuntime } from '../common/runtime';
import { PrismaService } from '../prisma/prisma.service';
import { isAdmin } from '../auth/permissions.util';

@WebSocketGateway({
  namespace: '/admin',
  ...getWebSocketCorsConfig(),
})
@Injectable()
export class AdminGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AdminGateway.name);
  private adminSockets: Map<string, Socket> = new Map();
  private readonly backgroundJobsDisabled = isVercelServerlessRuntime();

  constructor(
    private jwtService: JwtService,
    private adminService: AdminService,
    private prisma: PrismaService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Admin WebSocket Gateway initialized');
    if (this.backgroundJobsDisabled) {
      this.logger.log('Admin background metric broadcasts disabled in serverless runtime');
    }
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
      const userId = payload?.userId;

      if (!userId) {
        client.disconnect();
        return;
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          roles: true,
          isAdmin: true,
          superAdmin: true,
          isDeleted: true,
          accountStatus: true,
        },
      });

      if (
        !user ||
        user.isDeleted === true ||
        user.accountStatus === 'SUSPENDED' ||
        user.accountStatus === 'PENDING_DELETION' ||
        !isAdmin(user)
      ) {
        this.logger.warn(`Rejected admin socket connection: ${userId}`);
        client.disconnect();
        return;
      }

      this.adminSockets.set(user.id, client);
      this.logger.log(`Admin connected: ${user.email}`);

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
    this.emitToAdminSockets('visitor:location', data);
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
    if (this.backgroundJobsDisabled || this.adminSockets.size === 0) {
      return;
    }
    try {
      const summary = await this.adminService.getSummary();
      this.emitToAdminSockets('admin:metrics', summary);
    } catch (error) {
      this.logger.error('Error broadcasting metrics:', error);
    }
  }

  // Broadcast analytics every 30 seconds
  @Cron('*/30 * * * * *') // Every 30 seconds
  async broadcastAnalytics() {
    if (this.backgroundJobsDisabled || this.adminSockets.size === 0) {
      return;
    }
    try {
      const analytics = await this.adminService.getAnalytics();
      this.emitToAdminSockets('admin:analytics', analytics);
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
    this.emitToAdminSockets('admin:moderation', event);
  }

  // Emit system event
  emitSystemEvent(event: { type: string; message: string; data?: any }) {
    this.emitToAdminSockets('admin:system', event);
  }

  private emitToAdminSockets(event: string, data: unknown) {
    for (const socket of this.adminSockets.values()) {
      socket.emit(event, data);
    }
  }
}
