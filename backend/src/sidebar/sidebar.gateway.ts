import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { AdminGateway } from '../admin/admin.gateway';

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
@Injectable()
export class SidebarGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(private adminGateway: AdminGateway) {}

  handleConnection(client: Socket) {
    console.log('Sidebar client bağlandı:', client.id);
    
    // Get user IP and emit visitor location to admin panel
    const ip = client.handshake.address || client.request.socket.remoteAddress;
    this.emitVisitorLocation(client, ip);
  }

  // Tüm kullanıcılara yeni sidebar datasını gönder
  broadcastSidebarUpdate(newData: any) {
    this.server.emit('sidebarUpdate', newData);
  }

  // Emit visitor location (mock data for development)
  private async emitVisitorLocation(client: Socket, ip: string) {
    try {
      // In production, use a GeoIP service like ip-api.com or ipstack
      // For development, use mock data
      const mockLocations = [
        { country: 'Türkiye', city: 'İstanbul', lat: 41.0082, lon: 28.9784 },
        { country: 'Türkiye', city: 'Ankara', lat: 39.9334, lon: 32.8597 },
        { country: 'Türkiye', city: 'İzmir', lat: 38.4237, lon: 27.1428 },
        { country: 'Almanya', city: 'Berlin', lat: 52.52, lon: 13.405 },
        { country: 'Fransa', city: 'Paris', lat: 48.8566, lon: 2.3522 },
        { country: 'İngiltere', city: 'Londra', lat: 51.5074, lon: -0.1278 },
      ];

      const randomLocation = mockLocations[Math.floor(Math.random() * mockLocations.length)];
      
      // Get userId from token if available
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
      let userId = client.id; // Fallback to socket ID
      let username: string | undefined;

      if (token) {
        try {
          // You might want to verify token here
          // For now, we'll use socket ID as userId
        } catch (error) {
          // Token invalid, use socket ID
        }
      }

      // Emit to admin panel
      this.adminGateway.emitVisitorLocation({
        userId,
        country: randomLocation.country,
        city: randomLocation.city,
        lat: randomLocation.lat,
        lon: randomLocation.lon,
        timestamp: new Date().toISOString(),
        username,
      });
    } catch (error) {
      console.error('Error emitting visitor location:', error);
    }
  }
}

