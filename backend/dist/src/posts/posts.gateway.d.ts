import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
export declare class PostsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private jwtService;
    server: Server;
    private posts;
    constructor(jwtService: JwtService);
    afterInit(server: Server): void;
    handleConnection(client: Socket): void;
    handleDisconnect(client: Socket): void;
    handleCreatePost(post: any): any;
    handleGetPosts(client: Socket): any[];
    handleNewPost(post: any): any;
    handleUpdatePostLike(data: {
        postId: string;
        likes: number;
        likedBy: string[];
    }): {
        success: boolean;
    };
}
