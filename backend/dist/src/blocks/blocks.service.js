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
exports.BlocksService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let BlocksService = class BlocksService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async blockUser(blockerId, blockedId) {
        if (blockerId === blockedId) {
            throw new common_1.BadRequestException('Cannot block yourself');
        }
        const blockedUser = await this.prisma.user.findUnique({
            where: { id: blockedId },
        });
        if (!blockedUser) {
            throw new common_1.NotFoundException('User not found');
        }
        const existingBlock = await this.prisma.block.findUnique({
            where: {
                blockerId_blockedId: {
                    blockerId,
                    blockedId,
                },
            },
        });
        if (existingBlock) {
            return existingBlock;
        }
        return this.prisma.block.create({
            data: {
                blockerId,
                blockedId,
            },
        });
    }
    async unblockUser(blockerId, blockedId) {
        const block = await this.prisma.block.findUnique({
            where: {
                blockerId_blockedId: {
                    blockerId,
                    blockedId,
                },
            },
        });
        if (!block) {
            throw new common_1.NotFoundException('Block not found');
        }
        await this.prisma.block.delete({
            where: {
                blockerId_blockedId: {
                    blockerId,
                    blockedId,
                },
            },
        });
        return { success: true };
    }
    async isBlocked(userId1, userId2) {
        const block = await this.prisma.block.findFirst({
            where: {
                OR: [
                    { blockerId: userId1, blockedId: userId2 },
                    { blockerId: userId2, blockedId: userId1 },
                ],
            },
        });
        return !!block;
    }
    async checkBlockStatus(blockerId, blockedId) {
        try {
            const block = await this.prisma.block.findUnique({
                where: {
                    blockerId_blockedId: {
                        blockerId,
                        blockedId,
                    },
                },
            });
            return {
                isBlocked: !!block,
                block: block || null,
            };
        }
        catch (error) {
            console.error('Error checking block status:', error);
            return {
                isBlocked: false,
                block: null,
            };
        }
    }
    async getBlockedUsers(userId) {
        return this.prisma.block.findMany({
            where: { blockerId: userId },
            include: {
                blocked: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true,
                        fullName: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
};
exports.BlocksService = BlocksService;
exports.BlocksService = BlocksService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BlocksService);
//# sourceMappingURL=blocks.service.js.map