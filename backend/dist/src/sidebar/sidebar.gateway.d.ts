import { OnGatewayConnection } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AdminGateway } from '../admin/admin.gateway';
export declare class SidebarGateway implements OnGatewayConnection {
    private adminGateway;
    server: Server;
    constructor(adminGateway: AdminGateway);
    handleConnection(client: Socket): void;
    broadcastSidebarUpdate(newData: any): void;
    private emitVisitorLocation;
}
