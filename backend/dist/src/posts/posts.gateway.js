"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostsGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const jwt_1 = require("@nestjs/jwt");
const websocket_cors_util_1 = require("../common/utils/websocket-cors.util");
let PostsGateway = class PostsGateway {
    constructor(jwtService) {
        this.jwtService = jwtService;
        this.posts = [];
    }
    afterInit(server) {
        console.log('Posts WebSocket Gateway initialized');
    }
    handleConnection(client) {
        try {
            const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
            if (!token) {
                return;
            }
            try {
                const payload = this.jwtService.verify(token);
                console.log(`✅ Posts: ${payload.userId} connected`);
            }
            catch (error) {
                console.log('⚠️ Posts: Unauthenticated connection');
            }
        }
        catch (error) {
            console.error('Connection error:', error);
        }
    }
    handleDisconnect(client) {
        console.log('❌ Posts: Client disconnected');
    }
    handleCreatePost(post) {
        if (post.source === 'user') {
            if (!this.posts.some((p) => p.id === post.id)) {
                this.posts.unshift(post);
                this.server.emit('updatePosts', this.posts);
                console.log(`📝 New post added to global list: ${post.title || post.id}`);
            }
        }
        return post;
    }
    handleGetPosts(client) {
        client.emit('updatePosts', this.posts);
        console.log(`📤 Posts list sent to client (${this.posts.length} posts)`);
        return this.posts;
    }
    handleNewPost(post) {
        if (post.source === 'user') {
            this.handleCreatePost(post);
        }
        else {
            this.server.emit('newPost', post);
            console.log(`📝 New post broadcasted: ${post.title || post.id}`);
        }
        return post;
    }
    handleUpdatePostLike(data) {
        const postIndex = this.posts.findIndex((p) => p.id === data.postId);
        if (postIndex !== -1) {
            this.posts[postIndex] = {
                ...this.posts[postIndex],
                likes: data.likes,
                likedBy: data.likedBy,
            };
            this.server.emit('updatePosts', this.posts);
            console.log(`❤️ Post like updated: ${data.postId} (${data.likes} likes)`);
        }
        return { success: true };
    }
};
exports.PostsGateway = PostsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], PostsGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('createPost'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PostsGateway.prototype, "handleCreatePost", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('getPosts'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], PostsGateway.prototype, "handleGetPosts", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('newPost'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PostsGateway.prototype, "handleNewPost", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('updatePostLike'),
    __param(0, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], PostsGateway.prototype, "handleUpdatePostLike", null);
exports.PostsGateway = PostsGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        namespace: '/posts',
        ...(0, websocket_cors_util_1.getWebSocketCorsConfig)(),
    }),
    __metadata("design:paramtypes", [jwt_1.JwtService])
], PostsGateway);
//# sourceMappingURL=posts.gateway.js.map