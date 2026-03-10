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
exports.ArticleScheduler = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
const posts_gateway_1 = require("../posts/posts.gateway");
let ArticleScheduler = class ArticleScheduler {
    constructor(prisma, postsGateway) {
        this.prisma = prisma;
        this.postsGateway = postsGateway;
    }
    async publishScheduledArticles() {
        try {
            if (!this.prisma) {
                console.error('❌ Scheduler: PrismaService not available');
                return;
            }
            const now = new Date();
            const articles = await this.prisma.article.findMany({
                where: {
                    isPublished: false,
                    scheduledAt: {
                        lte: now,
                        not: null,
                    },
                },
                include: {
                    author: {
                        select: {
                            id: true,
                            username: true,
                            avatar: true,
                            fullName: true,
                        },
                    },
                },
            });
            if (articles.length === 0) {
                return;
            }
            for (const article of articles) {
                const published = await this.prisma.article.update({
                    where: { id: article.id },
                    data: {
                        isPublished: true,
                        scheduledAt: null,
                    },
                    include: {
                        author: {
                            select: {
                                id: true,
                                username: true,
                                avatar: true,
                                fullName: true,
                            },
                        },
                    },
                });
                if (this.postsGateway) {
                    this.postsGateway.server.emit('articleCreated', published);
                }
                console.log(`🕒 Zamanlanmış yazı yayınlandı: ${article.title} (${article.id})`);
            }
        }
        catch (error) {
            console.error('❌ Scheduler: Error publishing scheduled articles:', error?.message);
        }
    }
};
exports.ArticleScheduler = ArticleScheduler;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ArticleScheduler.prototype, "publishScheduledArticles", null);
exports.ArticleScheduler = ArticleScheduler = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)((0, common_1.forwardRef)(() => posts_gateway_1.PostsGateway))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        posts_gateway_1.PostsGateway])
], ArticleScheduler);
//# sourceMappingURL=articles.scheduler.js.map