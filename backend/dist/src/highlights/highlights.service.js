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
exports.HighlightsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let HighlightsService = class HighlightsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getMonthlyHighlights() {
        try {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth() + 1;
            console.log(`[HighlightsService] Getting monthly highlights for ${year}-${month}`);
            let monthlyHighlight = await this.prisma.monthlyHighlight.findFirst({
                where: {
                    year,
                    month,
                },
                include: {
                    museum: {
                        select: {
                            id: true,
                            username: true,
                            fullName: true,
                            avatar: true,
                            bio: true,
                        },
                    },
                    artwork: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    username: true,
                                    fullName: true,
                                    avatar: true,
                                },
                            },
                            media: {
                                take: 1,
                                orderBy: { order: 'asc' },
                            },
                        },
                    },
                    comment: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    username: true,
                                    fullName: true,
                                    avatar: true,
                                },
                            },
                            post: {
                                select: {
                                    id: true,
                                    caption: true,
                                },
                            },
                        },
                    },
                    collection: {
                        include: {
                            owner: {
                                select: {
                                    id: true,
                                    username: true,
                                    fullName: true,
                                    avatar: true,
                                },
                            },
                        },
                    },
                },
            });
            if (!monthlyHighlight) {
                console.log('[HighlightsService] No monthly highlight found, selecting automatic highlights');
                monthlyHighlight = await this.selectAutomaticHighlights(year, month);
            }
            const response = {
                museum: null,
                artwork: null,
                comment: null,
                collection: null,
            };
            if (monthlyHighlight.museumId && monthlyHighlight.museum) {
                response.museum = {
                    id: monthlyHighlight.museum.id,
                    name: monthlyHighlight.museum.fullName || monthlyHighlight.museum.username,
                    username: monthlyHighlight.museum.username,
                    imageUrl: monthlyHighlight.museum.avatar || null,
                    bio: monthlyHighlight.museum.bio || null,
                };
            }
            if (monthlyHighlight.artworkId && monthlyHighlight.artwork) {
                response.artwork = {
                    id: monthlyHighlight.artwork.id,
                    title: monthlyHighlight.artwork.title || monthlyHighlight.artwork.caption || 'İsimsiz',
                    postId: monthlyHighlight.artwork.id,
                    imageUrl: monthlyHighlight.artwork.media?.[0]?.url || null,
                    artist: {
                        id: monthlyHighlight.artwork.user.id,
                        username: monthlyHighlight.artwork.user.username,
                        fullName: monthlyHighlight.artwork.user.fullName,
                        avatar: monthlyHighlight.artwork.user.avatar,
                    },
                };
            }
            if (monthlyHighlight.commentId && monthlyHighlight.comment) {
                response.comment = {
                    id: monthlyHighlight.comment.id,
                    commentId: monthlyHighlight.comment.id,
                    postId: monthlyHighlight.comment.postId,
                    text: monthlyHighlight.comment.content,
                    username: monthlyHighlight.comment.user.username,
                    fullName: monthlyHighlight.comment.user.fullName || monthlyHighlight.comment.user.username,
                    avatar: monthlyHighlight.comment.user.avatar,
                };
            }
            if (monthlyHighlight.collectionId && monthlyHighlight.collection) {
                response.collection = {
                    id: monthlyHighlight.collection.id,
                    title: monthlyHighlight.collection.title,
                    coverImage: monthlyHighlight.collection.coverImage || null,
                    owner: {
                        id: monthlyHighlight.collection.owner.id,
                        username: monthlyHighlight.collection.owner.username,
                        fullName: monthlyHighlight.collection.owner.fullName,
                        avatar: monthlyHighlight.collection.owner.avatar,
                    },
                };
            }
            return response;
        }
        catch (error) {
            console.error('[HighlightsService] Error getting monthly highlights:', error);
            return {
                museum: null,
                artwork: null,
                comment: null,
                collection: null,
            };
        }
    }
    async selectAutomaticHighlights(year, month) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const topMuseum = await this.prisma.user.findFirst({
            where: {
                roles: { has: 'corporate' },
                createdAt: { lte: thirtyDaysAgo },
            },
            orderBy: {
                followerCount: 'desc',
            },
            select: {
                id: true,
                username: true,
                fullName: true,
                avatar: true,
                bio: true,
            },
        });
        const artworks = await this.prisma.post.findMany({
            where: {
                type: 'artwork',
                createdAt: { gte: thirtyDaysAgo },
            },
            include: {
                _count: {
                    select: {
                        likes: true,
                    },
                },
            },
            take: 100,
        });
        const topArtwork = artworks.length > 0
            ? artworks.sort((a, b) => (b._count?.likes || 0) - (a._count?.likes || 0))[0]
            : null;
        let artworkDetails = null;
        if (topArtwork) {
            artworkDetails = await this.prisma.post.findUnique({
                where: { id: topArtwork.id },
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            fullName: true,
                            avatar: true,
                        },
                    },
                    media: {
                        take: 1,
                        orderBy: { order: 'asc' },
                    },
                },
            });
        }
        const comments = await this.prisma.comment.findMany({
            where: {
                createdAt: { gte: thirtyDaysAgo },
            },
            include: {
                _count: {
                    select: {
                        likes: true,
                    },
                },
            },
            take: 100,
        });
        const topComment = comments.length > 0
            ? comments.sort((a, b) => (b._count?.likes || 0) - (a._count?.likes || 0))[0]
            : null;
        let commentDetails = null;
        if (topComment) {
            commentDetails = await this.prisma.comment.findUnique({
                where: { id: topComment.id },
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            fullName: true,
                            avatar: true,
                        },
                    },
                    post: {
                        select: {
                            id: true,
                            caption: true,
                        },
                    },
                },
            });
        }
        const collections = await this.prisma.collection.findMany({
            where: {
                createdAt: { gte: thirtyDaysAgo },
            },
            include: {
                _count: {
                    select: {
                        items: true,
                    },
                },
            },
            take: 100,
        });
        const topCollection = collections.length > 0
            ? collections.sort((a, b) => (b._count?.items || 0) - (a._count?.items || 0))[0]
            : null;
        let collectionDetails = null;
        if (topCollection) {
            collectionDetails = await this.prisma.collection.findUnique({
                where: { id: topCollection.id },
                include: {
                    owner: {
                        select: {
                            id: true,
                            username: true,
                            fullName: true,
                            avatar: true,
                        },
                    },
                },
            });
        }
        const created = await this.prisma.monthlyHighlight.create({
            data: {
                year,
                month,
                museumId: topMuseum?.id || null,
                artworkId: topArtwork?.id || null,
                commentId: topComment?.id || null,
                collectionId: topCollection?.id || null,
                isAuto: true,
            },
            include: {
                museum: {
                    select: {
                        id: true,
                        username: true,
                        fullName: true,
                        avatar: true,
                        bio: true,
                    },
                },
                artwork: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                fullName: true,
                                avatar: true,
                            },
                        },
                        media: {
                            take: 1,
                            orderBy: { order: 'asc' },
                        },
                    },
                },
                comment: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                fullName: true,
                                avatar: true,
                            },
                        },
                        post: {
                            select: {
                                id: true,
                                caption: true,
                            },
                        },
                    },
                },
                collection: {
                    include: {
                        owner: {
                            select: {
                                id: true,
                                username: true,
                                fullName: true,
                                avatar: true,
                            },
                        },
                    },
                },
            },
        });
        return created;
    }
};
exports.HighlightsService = HighlightsService;
exports.HighlightsService = HighlightsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], HighlightsService);
//# sourceMappingURL=highlights.service.js.map