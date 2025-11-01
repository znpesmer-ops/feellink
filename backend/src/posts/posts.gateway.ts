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

@WebSocketGateway({
  namespace: '/posts',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class PostsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // 🧠 Global yazı listesi - tüm kullanıcılar için tek kaynak
  private posts: any[] = [];

  constructor(private jwtService: JwtService) {}

  afterInit(server: Server) {
    console.log('Posts WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
      
      if (!token) {
        // Optional: allow unauthenticated connections for public post viewing
        return;
      }

      try {
        const payload = this.jwtService.verify(token);
        console.log(`✅ Posts: ${payload.userId} connected`);
      } catch (error) {
        // Allow connection but may have limited access
        console.log('⚠️ Posts: Unauthenticated connection');
      }
    } catch (error) {
      console.error('Connection error:', error);
    }
  }

  handleDisconnect(client: Socket) {
    console.log('❌ Posts: Client disconnected');
  }

  @SubscribeMessage('createPost')
  handleCreatePost(@MessageBody() post: any) {
    // Sadece "user" source'lu yazıları ekle
    if (post.source === 'user') {
      // Çift eklemeyi önle
      if (!this.posts.some((p) => p.id === post.id)) {
        this.posts.unshift(post);
        // Tüm bağlı kullanıcılara güncel listeyi gönder
        this.server.emit('updatePosts', this.posts);
        console.log(`📝 New post added to global list: ${post.title || post.id}`);
      }
    }
    return post;
  }

  @SubscribeMessage('getPosts')
  handleGetPosts(@ConnectedSocket() client: Socket) {
    // İlk bağlantıda tüm yazıları gönder
    client.emit('updatePosts', this.posts);
    console.log(`📤 Posts list sent to client (${this.posts.length} posts)`);
    return this.posts;
  }

  @SubscribeMessage('newPost')
  handleNewPost(@MessageBody() post: any) {
    // Eski event handler - geriye uyumluluk için
    if (post.source === 'user') {
      this.handleCreatePost(post);
    } else {
      // Diğer post türleri için sadece broadcast
      this.server.emit('newPost', post);
      console.log(`📝 New post broadcasted: ${post.title || post.id}`);
    }
    return post;
  }

  @SubscribeMessage('updatePostLike')
  handleUpdatePostLike(@MessageBody() data: { postId: string; likes: number; likedBy: string[] }) {
    // Yazı beğenisi güncellendiğinde global listeyi güncelle
    const postIndex = this.posts.findIndex((p) => p.id === data.postId);
    if (postIndex !== -1) {
      this.posts[postIndex] = {
        ...this.posts[postIndex],
        likes: data.likes,
        likedBy: data.likedBy,
      };
      // Güncel listeyi tüm kullanıcılara gönder
      this.server.emit('updatePosts', this.posts);
      console.log(`❤️ Post like updated: ${data.postId} (${data.likes} likes)`);
    }
    return { success: true };
  }
}

