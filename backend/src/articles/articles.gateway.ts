import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
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
  namespace: '/articles',
})
@Injectable()
export class ArticlesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ArticlesGateway.name);

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
      
      if (!token) {
        this.logger.warn(`❌ Articles: Unauthorized connection attempt`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.userId || payload.sub;
      client.data.userId = userId;
      
      this.logger.log(`✅ Articles: ${userId} connected`);
    } catch (error) {
      this.logger.error(`❌ Articles: Authentication failed`, error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`❌ Articles: Client disconnected`);
  }

  @SubscribeMessage('joinArticleRoom')
  handleJoinArticleRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() articleId: string,
  ) {
    const room = `article_${articleId}`;
    client.join(room);
    this.logger.log(`📝 Client joined room: ${room}`);
  }
}

