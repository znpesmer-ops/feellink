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
exports.ArticlesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const articles_service_1 = require("./articles.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let ArticlesController = class ArticlesController {
    constructor(articlesService) {
        this.articlesService = articlesService;
    }
    async create(user, body) {
        try {
            if (!body?.title?.trim() || !body?.content?.trim()) {
                throw new common_1.HttpException('Başlık ve içerik zorunludur', common_1.HttpStatus.BAD_REQUEST);
            }
            let scheduledAt = undefined;
            if (body.scheduledAt && body.scheduledAt.trim() !== '') {
                const parsed = new Date(body.scheduledAt);
                if (isNaN(parsed.getTime())) {
                    throw new common_1.HttpException('Geçersiz tarih formatı', common_1.HttpStatus.BAD_REQUEST);
                }
                scheduledAt = parsed;
            }
            return await this.articlesService.create(user.id, body.title.trim(), body.content.trim(), body.coverImage, body.excerpt?.trim(), Boolean(body.publish), scheduledAt);
        }
        catch (error) {
            console.error('ARTICLE_CREATE_ERROR:', error?.message, error);
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException(error?.message || 'Yazı oluşturulurken bir hata oluştu', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getDrafts(user) {
        return this.articlesService.findDrafts(user.id);
    }
    async getScheduled(user) {
        return this.articlesService.findScheduled(user.id);
    }
    async getPublished(user) {
        return this.articlesService.findPublished(user.id);
    }
    async publish(id, user) {
        return this.articlesService.publish(id, user.id);
    }
    async getAllPublic() {
        return this.articlesService.findAllPublic();
    }
    async getAllPublishedArticles() {
        return this.articlesService.findAllPublic();
    }
    async getMyArticles(user) {
        const [published, drafts] = await Promise.all([
            this.articlesService.findPublished(user.id),
            this.articlesService.findDrafts(user.id),
        ]);
        return [...published, ...drafts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    async getUserArticles(userId) {
        return this.articlesService.findByUserId(userId);
    }
    async getArticle(id) {
        return this.articlesService.findOne(id);
    }
    async update(id, user, body) {
        const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : undefined;
        const { publish, ...restBody } = body;
        const updateData = { ...restBody, scheduledAt };
        if (publish !== undefined) {
            updateData.isPublished = publish && !scheduledAt;
        }
        return this.articlesService.update(id, user.id, updateData);
    }
    async delete(id, user) {
        return this.articlesService.delete(id, user.id);
    }
    async incrementView(id) {
        try {
            await this.articlesService.incrementView(id);
            return { success: true };
        }
        catch (error) {
            console.error('View Increment Error:', error);
            return { success: false };
        }
    }
    async createComment(articleId, user, body) {
        return this.articlesService.createComment(articleId, user.id, body.content);
    }
    async deleteComment(commentId, user) {
        return this.articlesService.deleteComment(commentId, user.id);
    }
    async replyComment(commentId, user, body) {
        return this.articlesService.createReply(commentId, user.id, body.content);
    }
    async toggleCommentLike(commentId, user) {
        return this.articlesService.toggleCommentLike(commentId, user.id);
    }
    async getTopLikedAuthors(limit) {
        const n = Math.min(Math.max(Number(limit ?? 4), 1), 6);
        return this.articlesService.getTopLikedAuthors(n);
    }
};
exports.ArticlesController = ArticlesController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new article' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ArticlesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('/drafts'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get my drafts' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ArticlesController.prototype, "getDrafts", null);
__decorate([
    (0, common_1.Get)('/scheduled'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get my scheduled articles' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ArticlesController.prototype, "getScheduled", null);
__decorate([
    (0, common_1.Get)('/published'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get my published articles' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ArticlesController.prototype, "getPublished", null);
__decorate([
    (0, common_1.Put)('/:id/publish'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Publish a draft article' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ArticlesController.prototype, "publish", null);
__decorate([
    (0, common_1.Get)('/public'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all public articles' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ArticlesController.prototype, "getAllPublic", null);
__decorate([
    (0, common_1.Get)('/published/all'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all published articles from all users' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ArticlesController.prototype, "getAllPublishedArticles", null);
__decorate([
    (0, common_1.Get)('/my'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get my articles (including unpublished)' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ArticlesController.prototype, "getMyArticles", null);
__decorate([
    (0, common_1.Get)('/user/:userId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get articles by user ID' }),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ArticlesController.prototype, "getUserArticles", null);
__decorate([
    (0, common_1.Get)('/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get article by ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ArticlesController.prototype, "getArticle", null);
__decorate([
    (0, common_1.Put)('/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update article' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ArticlesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)('/:id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Delete article' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ArticlesController.prototype, "delete", null);
__decorate([
    (0, common_1.Post)('/:id/view'),
    (0, swagger_1.ApiOperation)({ summary: 'Increment article view count' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ArticlesController.prototype, "incrementView", null);
__decorate([
    (0, common_1.Post)('/:id/comments'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Add comment to article' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ArticlesController.prototype, "createComment", null);
__decorate([
    (0, common_1.Delete)('/comments/:commentId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Delete article comment' }),
    __param(0, (0, common_1.Param)('commentId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ArticlesController.prototype, "deleteComment", null);
__decorate([
    (0, common_1.Post)('/comments/:commentId/reply'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Reply to a comment' }),
    __param(0, (0, common_1.Param)('commentId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], ArticlesController.prototype, "replyComment", null);
__decorate([
    (0, common_1.Post)('/comments/:commentId/like'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Toggle like on a comment' }),
    __param(0, (0, common_1.Param)('commentId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ArticlesController.prototype, "toggleCommentLike", null);
__decorate([
    (0, common_1.Get)('/top-liked-authors'),
    (0, swagger_1.ApiOperation)({ summary: 'Get top liked authors (by article views)' }),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ArticlesController.prototype, "getTopLikedAuthors", null);
exports.ArticlesController = ArticlesController = __decorate([
    (0, swagger_1.ApiTags)('Articles'),
    (0, common_1.Controller)('articles'),
    __metadata("design:paramtypes", [articles_service_1.ArticlesService])
], ArticlesController);
//# sourceMappingURL=articles.controller.js.map