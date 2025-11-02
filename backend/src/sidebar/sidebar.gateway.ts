import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SidebarGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  handleConnection(client: any) {
    console.log('Sidebar client bağlandı:', client.id);
  }

  // Tüm kullanıcılara yeni sidebar datasını gönder
  broadcastSidebarUpdate(newData: any) {
    this.server.emit('sidebarUpdate', newData);
  }
}

