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
exports.FollowService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const notifications_service_1 = require("../notifications/notifications.service");
const notifications_gateway_1 = require("../notifications/notifications.gateway");
let FollowService = class FollowService {
    constructor(prisma, notificationsService, notificationsGateway) {
        this.prisma = prisma;
        this.notificationsService = notificationsService;
        this.notificationsGateway = notificationsGateway;
    }
    async incrementFollowCounts(followerId, followeeId) {
        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: followerId },
                data: { followingCount: { increment: 1 } },
            }),
            this.prisma.user.update({
                where: { id: followeeId },
                data: { followerCount: { increment: 1 } },
            }),
        ]);
    }
    async decrementFollowCounts(followerId, followeeId) {
        await this.prisma.$transaction([
            this.prisma.user.update({
                where: { id: followerId },
                data: { followingCount: { decrement: 1 } },
            }),
            this.prisma.user.update({
                where: { id: followeeId },
                data: { followerCount: { decrement: 1 } },
            }),
        ]);
    }
    async followUser(followerId, followingId) {
        if (followerId === followingId) {
            throw new common_1.BadRequestException('Cannot follow yourself');
        }
        const following = await this.prisma.user.findUnique({
            where: { id: followingId },
        });
        if (!following) {
            throw new common_1.NotFoundException('User not found');
        }
        const isBlocked = await this.prisma.block.findFirst({
            where: {
                OR: [
                    { blockerId: followerId, blockedId: followingId },
                    { blockerId: followingId, blockedId: followerId },
                ],
            },
        });
        if (isBlocked) {
            throw new common_1.ForbiddenException('Cannot follow this user');
        }
        const existingFollow = await this.prisma.follow.findUnique({
            where: {
                followerId_followingId: {
                    followerId,
                    followingId,
                },
            },
        });
        if (existingFollow) {
            throw new common_1.BadRequestException('Already following this user');
        }
        if (following.isPrivate) {
            const existingRequest = await this.prisma.followRequest.findUnique({
                where: {
                    requesterId_requestedId: {
                        requesterId: followerId,
                        requestedId: followingId,
                    },
                },
            });
            if (existingRequest) {
                throw new common_1.BadRequestException('Follow request already sent');
            }
            await this.prisma.followRequest.create({
                data: {
                    requesterId: followerId,
                    requestedId: followingId,
                },
            });
            const allowed = await this.notificationsService.isAllowed(followingId, 'follow_request');
            if (allowed) {
                await this.notificationsService.createNotification({
                    userId: followingId,
                    type: 'follow_request',
                    fromUserId: followerId,
                    targetUrl: `/profile/${following.username}`,
                });
            }
            else {
                console.log(`⏭️ Follow request notification skipped (preference disabled)`);
            }
            return { status: 'requested' };
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.follow.create({
                data: {
                    followerId,
                    followingId,
                },
            });
        });
        await this.incrementFollowCounts(followerId, followingId);
        const allowed = await this.notificationsService.isAllowed(followingId, 'follow');
        if (allowed) {
            await this.notificationsService.createNotification({
                userId: followingId,
                type: 'follow',
                fromUserId: followerId,
                targetUrl: `/profile/${following.username}`,
            });
        }
        else {
            console.log(`⏭️ Follow notification skipped (preference disabled)`);
        }
        return { status: 'following' };
    }
    async unfollowUser(followerId, followingId) {
        const existingFollow = await this.prisma.follow.findUnique({
            where: {
                followerId_followingId: {
                    followerId,
                    followingId,
                },
            },
        });
        if (!existingFollow) {
            return { status: 'unfollowed' };
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.follow.delete({
                where: {
                    followerId_followingId: {
                        followerId,
                        followingId,
                    },
                },
            });
        });
        await this.decrementFollowCounts(followerId, followingId);
        return { status: 'unfollowed' };
    }
    async acceptFollowRequest(requestedId, requesterId) {
        const request = await this.prisma.followRequest.findUnique({
            where: {
                requesterId_requestedId: {
                    requesterId,
                    requestedId,
                },
            },
        });
        if (!request) {
            throw new common_1.NotFoundException('Follow request not found');
        }
        const [requester, requested] = await Promise.all([
            this.prisma.user.findUnique({ where: { id: requesterId }, select: { username: true } }),
            this.prisma.user.findUnique({ where: { id: requestedId }, select: { username: true } }),
        ]);
        const existingFollow = await this.prisma.follow.findUnique({
            where: {
                followerId_followingId: {
                    followerId: requesterId,
                    followingId: requestedId,
                },
            },
        });
        if (existingFollow) {
            await this.prisma.followRequest.delete({
                where: {
                    id: request.id,
                },
            });
            throw new common_1.BadRequestException('Already following this user');
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.followRequest.delete({
                where: {
                    id: request.id,
                },
            });
            await tx.follow.create({
                data: {
                    followerId: requesterId,
                    followingId: requestedId,
                },
            });
            await tx.notification.deleteMany({
                where: {
                    userId: requestedId,
                    type: 'follow_request',
                    fromUserId: requesterId,
                },
            });
        });
        await this.incrementFollowCounts(requesterId, requestedId);
        const allowed = await this.notificationsService.isAllowed(requesterId, 'follow_accept');
        if (allowed) {
            await this.notificationsService.createNotification({
                userId: requesterId,
                type: 'follow_accept',
                fromUserId: requestedId,
                targetUrl: `/profile/${requested?.username || requestedId}`,
            });
        }
        else {
            console.log(`⏭️ Follow accept notification skipped (preference disabled)`);
        }
        return { status: 'accepted' };
    }
    async rejectFollowRequest(requestedId, requesterId) {
        const request = await this.prisma.followRequest.findUnique({
            where: {
                requesterId_requestedId: {
                    requesterId,
                    requestedId,
                },
            },
        });
        if (!request) {
            throw new common_1.NotFoundException('Follow request not found');
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.followRequest.delete({
                where: {
                    id: request.id,
                },
            });
            await tx.notification.deleteMany({
                where: {
                    userId: requestedId,
                    type: 'follow_request',
                    fromUserId: requesterId,
                },
            });
        });
        return { status: 'rejected' };
    }
    async cancelFollowRequest(requesterId, requestedId) {
        const request = await this.prisma.followRequest.findUnique({
            where: {
                requesterId_requestedId: {
                    requesterId,
                    requestedId,
                },
            },
        });
        if (!request) {
            throw new common_1.NotFoundException('Follow request not found');
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.followRequest.delete({
                where: {
                    id: request.id,
                },
            });
            await tx.notification.deleteMany({
                where: {
                    userId: requestedId,
                    type: 'follow_request',
                    fromUserId: requesterId,
                },
            });
        });
        this.notificationsGateway.notifyUser(requestedId, {
            type: 'follow_request_cancelled',
            fromUserId: requesterId,
        });
        return { status: 'cancelled' };
    }
    async blockUser(blockerId, blockedId) {
        if (blockerId === blockedId) {
            throw new common_1.BadRequestException('Cannot block yourself');
        }
        const follow1 = await this.prisma.follow.findUnique({
            where: {
                followerId_followingId: {
                    followerId: blockerId,
                    followingId: blockedId,
                },
            },
        });
        const follow2 = await this.prisma.follow.findUnique({
            where: {
                followerId_followingId: {
                    followerId: blockedId,
                    followingId: blockerId,
                },
            },
        });
        await this.prisma.$transaction(async (tx) => {
            if (follow1) {
                await tx.follow.delete({
                    where: {
                        followerId_followingId: {
                            followerId: blockerId,
                            followingId: blockedId,
                        },
                    },
                });
            }
            if (follow2) {
                await tx.follow.delete({
                    where: {
                        followerId_followingId: {
                            followerId: blockedId,
                            followingId: blockerId,
                        },
                    },
                });
            }
            await tx.followRequest.deleteMany({
                where: {
                    OR: [
                        { requesterId: blockerId, requestedId: blockedId },
                        { requesterId: blockedId, requestedId: blockerId },
                    ],
                },
            });
            await tx.block.upsert({
                where: {
                    blockerId_blockedId: {
                        blockerId,
                        blockedId,
                    },
                },
                create: {
                    blockerId,
                    blockedId,
                },
                update: {},
            });
        });
        if (follow1) {
            await this.decrementFollowCounts(blockerId, blockedId);
        }
        if (follow2) {
            await this.decrementFollowCounts(blockedId, blockerId);
        }
        return { status: 'blocked' };
    }
    async unblockUser(blockerId, blockedId) {
        await this.prisma.block.deleteMany({
            where: {
                blockerId,
                blockedId,
            },
        });
        return { status: 'unblocked' };
    }
    async getFollowRequests(userId) {
        const requests = await this.prisma.followRequest.findMany({
            where: { requestedId: userId },
            include: {
                requester: {
                    select: {
                        id: true,
                        username: true,
                        fullName: true,
                        avatar: true,
                        isVerified: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return requests;
    }
    async getFollowers(userId, currentUserId) {
        const followers = await this.prisma.follow.findMany({
            where: {
                followingId: userId,
            },
            include: {
                follower: {
                    select: {
                        id: true,
                        username: true,
                        fullName: true,
                        avatar: true,
                        isVerified: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return followers.map(f => f.follower);
    }
    async getFollowing(userId, currentUserId) {
        const following = await this.prisma.follow.findMany({
            where: {
                followerId: userId,
            },
            include: {
                following: {
                    select: {
                        id: true,
                        username: true,
                        fullName: true,
                        avatar: true,
                        isVerified: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return following.map(f => f.following);
    }
    async removeFollower(currentUserId, targetUserId) {
        if (currentUserId === targetUserId) {
            throw new common_1.BadRequestException('Cannot remove yourself as a follower');
        }
        const existingFollow = await this.prisma.follow.findUnique({
            where: {
                followerId_followingId: {
                    followerId: targetUserId,
                    followingId: currentUserId,
                },
            },
        });
        if (!existingFollow) {
            return { status: 'removed' };
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.follow.delete({
                where: {
                    followerId_followingId: {
                        followerId: targetUserId,
                        followingId: currentUserId,
                    },
                },
            });
        });
        await this.decrementFollowCounts(targetUserId, currentUserId);
        return { status: 'removed' };
    }
};
exports.FollowService = FollowService;
exports.FollowService = FollowService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        notifications_service_1.NotificationsService,
        notifications_gateway_1.NotificationsGateway])
], FollowService);
//# sourceMappingURL=follow.service.js.map