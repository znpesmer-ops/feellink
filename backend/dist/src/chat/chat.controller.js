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
exports.ChatController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const chat_service_1 = require("./chat.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let ChatController = class ChatController {
    constructor(chatService) {
        this.chatService = chatService;
    }
    async getConversations(user) {
        return this.chatService.getConversations(user.id);
    }
    async getConversation(id, user) {
        return this.chatService.getConversation(id, user.id);
    }
    async getMessages(id, limit = '50', cursor, user) {
        return this.chatService.getMessages(id, user.id, parseInt(limit), cursor);
    }
    async createConversation(body, user) {
        if (!user || !user.id) {
            throw new Error('Kullanıcı doğrulaması başarısız');
        }
        return this.chatService.createConversation(user.id, body.participantIds, body.context, body.jobId, body.applicationId);
    }
    async markAsRead(id, user) {
        if (!user || !user.id) {
            throw new Error('Kullanıcı doğrulaması başarısız');
        }
        return this.chatService.markAsRead(id, user.id);
    }
    async deleteConversation(id, user) {
        if (!user || !user.id) {
            throw new Error('Kullanıcı doğrulaması başarısız');
        }
        return this.chatService.deleteConversation(id, user.id);
    }
    async editMessage(id, body, user) {
        if (!user || !user.id) {
            throw new Error('Kullanıcı doğrulaması başarısız');
        }
        return this.chatService.editMessage(id, user.id, body.content);
    }
    async deleteMessage(id, user) {
        if (!user || !user.id) {
            throw new Error('Kullanıcı doğrulaması başarısız');
        }
        return this.chatService.deleteMessage(id, user.id);
    }
    async createMessage(body, user) {
        if (!user || !user.id) {
            throw new Error('Kullanıcı doğrulaması başarısız');
        }
        return this.chatService.createMessage(user.id, body.conversationId, body.content, body.imageUrl, body.fileUrl, body.fileName, body.fileType);
    }
    async getMedia(conversationId, user) {
        return this.chatService.getMedia(conversationId, user.id);
    }
    async getFiles(conversationId, user) {
        return this.chatService.getFiles(conversationId, user.id);
    }
    async getMessageRequests(user) {
        return this.chatService.getMessageRequests(user.id);
    }
    async acceptMessageRequest(conversationId, user) {
        return this.chatService.acceptMessageRequest(conversationId, user.id);
    }
    async declineMessageRequest(conversationId, user) {
        return this.chatService.declineMessageRequest(conversationId, user.id);
    }
    async getUnreadCount(user) {
        const count = await this.chatService.getUnreadMessageCount(user.id);
        return { count };
    }
};
exports.ChatController = ChatController;
__decorate([
    (0, common_1.Get)('conversations'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all conversations for current user' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getConversations", null);
__decorate([
    (0, common_1.Get)('conversations/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get conversation details' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getConversation", null);
__decorate([
    (0, common_1.Get)('conversations/:id/messages'),
    (0, swagger_1.ApiOperation)({ summary: 'Get messages from a conversation' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('cursor')),
    __param(3, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getMessages", null);
__decorate([
    (0, common_1.Post)('conversations'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new conversation' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "createConversation", null);
__decorate([
    (0, common_1.Put)('conversations/:id/read'),
    (0, swagger_1.ApiOperation)({ summary: 'Mark messages as read' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "markAsRead", null);
__decorate([
    (0, common_1.Delete)('conversations/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a conversation' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "deleteConversation", null);
__decorate([
    (0, common_1.Put)('messages/:id/edit'),
    (0, swagger_1.ApiOperation)({ summary: 'Edit a message' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "editMessage", null);
__decorate([
    (0, common_1.Delete)('messages/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a message' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "deleteMessage", null);
__decorate([
    (0, common_1.Post)('messages'),
    (0, swagger_1.ApiOperation)({ summary: 'Send a message (REST API fallback for Vercel)' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "createMessage", null);
__decorate([
    (0, common_1.Get)('conversations/:id/media'),
    (0, swagger_1.ApiOperation)({ summary: 'Get media (images) from a conversation' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getMedia", null);
__decorate([
    (0, common_1.Get)('conversations/:id/files'),
    (0, swagger_1.ApiOperation)({ summary: 'Get files from a conversation' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getFiles", null);
__decorate([
    (0, common_1.Get)('message-requests'),
    (0, swagger_1.ApiOperation)({ summary: 'Get message requests (Instagram style)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getMessageRequests", null);
__decorate([
    (0, common_1.Put)('message-requests/:id/accept'),
    (0, swagger_1.ApiOperation)({ summary: 'Accept a message request' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "acceptMessageRequest", null);
__decorate([
    (0, common_1.Put)('message-requests/:id/decline'),
    (0, swagger_1.ApiOperation)({ summary: 'Decline a message request' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "declineMessageRequest", null);
__decorate([
    (0, common_1.Get)('unread-count'),
    (0, swagger_1.ApiOperation)({ summary: 'Get total unread message count' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ChatController.prototype, "getUnreadCount", null);
exports.ChatController = ChatController = __decorate([
    (0, swagger_1.ApiTags)('Chat'),
    (0, common_1.Controller)('chat'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [chat_service_1.ChatService])
], ChatController);
//# sourceMappingURL=chat.controller.js.map