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
exports.HighlightsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const highlights_service_1 = require("./highlights.service");
const prisma_service_1 = require("../prisma/prisma.service");
let HighlightsController = class HighlightsController {
    constructor(highlightsService, prisma) {
        this.highlightsService = highlightsService;
        this.prisma = prisma;
    }
    async getMonthlyHighlights() {
        return this.highlightsService.getMonthlyHighlights();
    }
    async getHighlightsByUserId(userId) {
        return this.prisma.highlight.findMany({
            where: { userId },
            include: {
                coverPost: {
                    select: {
                        id: true,
                        media: {
                            select: {
                                url: true,
                                type: true,
                            },
                            take: 1,
                        },
                    },
                },
                items: {
                    include: {
                        post: {
                            select: {
                                id: true,
                                caption: true,
                                title: true,
                                media: {
                                    select: {
                                        url: true,
                                        type: true,
                                    },
                                    take: 1,
                                },
                            },
                        },
                    },
                    orderBy: { sortOrder: 'asc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getHighlightsByUsername(username) {
        if (username === 'monthly' || username === 'user') {
            throw new common_1.BadRequestException('Invalid username');
        }
        const user = await this.prisma.user.findUnique({
            where: { username },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return this.prisma.highlight.findMany({
            where: { userId: user.id },
            include: {
                coverPost: {
                    select: {
                        id: true,
                        media: {
                            select: {
                                url: true,
                                type: true,
                            },
                            take: 1,
                        },
                    },
                },
                items: {
                    include: {
                        post: {
                            select: {
                                id: true,
                                caption: true,
                                title: true,
                                media: {
                                    select: {
                                        url: true,
                                        type: true,
                                    },
                                    take: 1,
                                },
                            },
                        },
                    },
                    orderBy: { sortOrder: 'asc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async createHighlight(body, req) {
        if (!req.user || !req.user.id) {
            throw new common_1.BadRequestException('Kullanıcı doğrulaması başarısız');
        }
        return this.prisma.highlight.create({
            data: {
                title: body.title,
                userId: req.user.id,
                coverPostId: body.coverPostId || null,
            },
            include: {
                coverPost: {
                    select: {
                        id: true,
                        media: {
                            select: {
                                url: true,
                                type: true,
                            },
                            take: 1,
                        },
                    },
                },
                items: true,
            },
        });
    }
    async deleteHighlight(id, req) {
        if (!req.user || !req.user.id) {
            throw new common_1.BadRequestException('Kullanıcı doğrulaması başarısız');
        }
        if (!id || id === 'undefined' || id === 'null') {
            throw new common_1.BadRequestException('Valid highlight ID is required');
        }
        const highlight = await this.prisma.highlight.findUnique({
            where: { id },
        });
        if (!highlight) {
            throw new common_1.NotFoundException('Highlight not found');
        }
        if (highlight.userId !== req.user.id) {
            throw new common_1.ForbiddenException('You can only delete your own highlights');
        }
        await this.prisma.highlight.delete({
            where: { id },
        });
        return { success: true, message: 'Highlight deleted successfully' };
    }
    async addPostsToHighlight(id, body, req) {
        if (!req.user || !req.user.id) {
            throw new common_1.BadRequestException('Kullanıcı doğrulaması başarısız');
        }
        if (!id) {
            throw new common_1.BadRequestException('Highlight ID is required');
        }
        const highlight = await this.prisma.highlight.findUnique({
            where: { id },
        });
        if (!highlight) {
            throw new common_1.NotFoundException('Highlight not found');
        }
        if (highlight.userId !== req.user.id) {
            throw new common_1.ForbiddenException('You can only modify your own highlights');
        }
        const existingItems = await this.prisma.highlightItem.findMany({
            where: { highlightId: id },
        });
        let maxSortOrder = existingItems.length > 0
            ? Math.max(...existingItems.map((item) => item.sortOrder))
            : 0;
        const createPromises = body.postIds.map((postId, index) => this.prisma.highlightItem.create({
            data: {
                highlightId: id,
                postId,
                sortOrder: maxSortOrder + index + 1,
            },
        }));
        await Promise.all(createPromises);
        return { success: true, message: 'Posts added to highlight' };
    }
    async removePostsFromHighlight(id, body, req) {
        if (!req.user || !req.user.id) {
            throw new common_1.BadRequestException('Kullanıcı doğrulaması başarısız');
        }
        if (!id) {
            throw new common_1.BadRequestException('Highlight ID is required');
        }
        const highlight = await this.prisma.highlight.findUnique({
            where: { id },
        });
        if (!highlight) {
            throw new common_1.NotFoundException('Highlight not found');
        }
        if (highlight.userId !== req.user.id) {
            throw new common_1.ForbiddenException('You can only modify your own highlights');
        }
        await this.prisma.highlightItem.deleteMany({
            where: {
                highlightId: id,
                postId: { in: body.postIds },
            },
        });
        return { success: true, message: 'Posts removed from highlight' };
    }
    async renameHighlight(id, body, req) {
        if (!req.user || !req.user.id) {
            throw new common_1.BadRequestException('Kullanıcı doğrulaması başarısız');
        }
        if (!id) {
            throw new common_1.BadRequestException('Highlight ID is required');
        }
        const highlight = await this.prisma.highlight.findUnique({
            where: { id },
        });
        if (!highlight) {
            throw new common_1.NotFoundException('Highlight not found');
        }
        if (highlight.userId !== req.user.id) {
            throw new common_1.ForbiddenException('You can only modify your own highlights');
        }
        return this.prisma.highlight.update({
            where: { id },
            data: { title: body.title },
        });
    }
};
exports.HighlightsController = HighlightsController;
__decorate([
    (0, common_1.Get)('monthly'),
    (0, swagger_1.ApiOperation)({ summary: 'Get monthly highlights (Ayın Öne Çıkanları)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], HighlightsController.prototype, "getMonthlyHighlights", null);
__decorate([
    (0, common_1.Get)('user/:userId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get user highlights by userId' }),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], HighlightsController.prototype, "getHighlightsByUserId", null);
__decorate([
    (0, common_1.Get)(':username'),
    (0, swagger_1.ApiOperation)({ summary: 'Get user highlights by username' }),
    __param(0, (0, common_1.Param)('username')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], HighlightsController.prototype, "getHighlightsByUsername", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new highlight' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], HighlightsController.prototype, "createHighlight", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a highlight' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], HighlightsController.prototype, "deleteHighlight", null);
__decorate([
    (0, common_1.Post)(':id/add-posts'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Add posts to highlight' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], HighlightsController.prototype, "addPostsToHighlight", null);
__decorate([
    (0, common_1.Delete)(':id/remove-posts'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Remove posts from highlight' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], HighlightsController.prototype, "removePostsFromHighlight", null);
__decorate([
    (0, common_1.Post)(':id/rename'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Rename highlight' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], HighlightsController.prototype, "renameHighlight", null);
exports.HighlightsController = HighlightsController = __decorate([
    (0, swagger_1.ApiTags)('Highlights'),
    (0, common_1.Controller)('highlights'),
    __metadata("design:paramtypes", [highlights_service_1.HighlightsService,
        prisma_service_1.PrismaService])
], HighlightsController);
//# sourceMappingURL=highlights.controller.js.map