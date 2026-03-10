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
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoriesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const media_service_1 = require("../media/media.service");
let StoriesService = class StoriesService {
    constructor(prisma, mediaService) {
        this.prisma = prisma;
        this.mediaService = mediaService;
    }
    async createStory(userId, mediaUrl, mediaType) {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        return this.prisma.story.create({
            data: {
                userId,
                mediaUrl,
                mediaType,
                expiresAt,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        fullName: true,
                        avatar: true,
                        isVerified: true,
                    },
                },
            },
        });
    }
    async getStories(userId) {
        const following = await this.prisma.follow.findMany({
            where: { followerId: userId },
            select: { followingId: true },
        });
        const followingIds = following.map(f => f.followingId);
        const stories = await this.prisma.story.findMany({
            where: {
                userId: { in: followingIds },
                expiresAt: { gt: new Date() },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        fullName: true,
                        avatar: true,
                        isVerified: true,
                    },
                },
                _count: {
                    select: {
                        views: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        const groupedStories = {};
        for (const story of stories) {
            if (!groupedStories[story.userId]) {
                groupedStories[story.userId] = {
                    user: story.user,
                    stories: [],
                };
            }
            groupedStories[story.userId].stories.push(story);
        }
        return Object.values(groupedStories);
    }
    async viewStory(storyId, userId) {
        const existingView = await this.prisma.storyView.findUnique({
            where: {
                storyId_userId: {
                    storyId,
                    userId,
                },
            },
        });
        if (existingView) {
            return existingView;
        }
        return this.prisma.storyView.create({
            data: {
                storyId,
                userId,
            },
        });
    }
    async deleteStory(storyId, userId) {
        const story = await this.prisma.story.findUnique({
            where: { id: storyId },
        });
        if (!story || story.userId !== userId) {
            throw new Error('Story not found or unauthorized');
        }
        await this.mediaService.deleteFile(story.mediaUrl);
        await this.prisma.story.delete({
            where: { id: storyId },
        });
        return { status: 'deleted' };
    }
};
exports.StoriesService = StoriesService;
exports.StoriesService = StoriesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        media_service_1.MediaService])
], StoriesService);
//# sourceMappingURL=stories.service.js.map