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
exports.LimitsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const roles_utils_1 = require("../roles/roles.utils");
const limits_config_1 = require("./limits.config");
let LimitsService = class LimitsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    getMonthStart(reference = new Date()) {
        return new Date(reference.getFullYear(), reference.getMonth(), 1);
    }
    async loadUserCapabilities(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                roles: true,
                plan: true,
                badges: true,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const plan = user.plan ?? 'FREE';
        const roles = Array.isArray(user.roles) ? user.roles : [];
        const badges = Array.isArray(user.badges) ? user.badges : [];
        const capabilities = (0, roles_utils_1.computeCapabilities)(roles, plan, badges);
        return { capabilities };
    }
    async ensureCanCreateEvent(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                roles: true,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const roles = Array.isArray(user.roles) ? user.roles : [];
        const isAdmin = roles.includes('ADMIN') || roles.some((r) => r.toUpperCase() === 'ADMIN');
        if (isAdmin) {
            const { capabilities } = await this.loadUserCapabilities(userId);
            return capabilities;
        }
        const { capabilities } = await this.loadUserCapabilities(userId);
        const { permissions, limits } = capabilities;
        if (!permissions.canCreateEvents) {
            throw new common_1.ForbiddenException({
                statusCode: 403,
                code: 'LIMIT_REACHED',
                message: 'Bu hesap tipi ile etkinlik oluşturamazsınız.',
            });
        }
        if (typeof limits.eventLimitMonthly === 'number') {
            const monthStart = this.getMonthStart();
            const createdThisMonth = await this.prisma.event.count({
                where: {
                    ownerId: userId,
                    createdAt: { gte: monthStart },
                },
            });
            if (createdThisMonth >= limits.eventLimitMonthly) {
                throw new common_1.ForbiddenException({
                    statusCode: 403,
                    code: 'LIMIT_REACHED',
                    message: `Bu ay için etkinlik oluşturma limitinize ulaştınız. Limit: ${limits.eventLimitMonthly}.`,
                });
            }
        }
        return capabilities;
    }
    async ensureCanCreateArtwork(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                roles: true,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const roles = Array.isArray(user.roles) ? user.roles : [];
        const isAdmin = roles.includes('ADMIN') || roles.some((r) => r.toUpperCase() === 'ADMIN');
        if (isAdmin) {
            const { capabilities } = await this.loadUserCapabilities(userId);
            return capabilities;
        }
        const { capabilities } = await this.loadUserCapabilities(userId);
        const { permissions, limits } = capabilities;
        if (typeof limits.artworkLimitMonthly === 'number') {
            const monthStart = this.getMonthStart();
            const createdThisMonth = await this.prisma.post.count({
                where: {
                    userId,
                    type: 'artwork',
                    createdAt: { gte: monthStart },
                },
            });
            if (createdThisMonth >= limits.artworkLimitMonthly) {
                throw new common_1.ForbiddenException({
                    statusCode: 403,
                    code: 'LIMIT_REACHED',
                    message: `Bu ay için eser yükleme limitinize ulaştınız. Limit: ${limits.artworkLimitMonthly}.`,
                });
            }
            return capabilities;
        }
        if (!permissions.canCreateArtworks) {
            throw new common_1.ForbiddenException({
                statusCode: 403,
                code: 'LIMIT_REACHED',
                message: 'Bu hesap tipi ile eser oluşturamazsınız.',
            });
        }
        return capabilities;
    }
    async ensureLimit(userId, action) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                roles: true,
                plan: true,
                extras: true,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const role = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles[0] : null;
        const plan = user.plan ?? 'FREE';
        if (!role) {
            return;
        }
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const sixMonthsAgo = new Date(now);
        sixMonthsAgo.setMonth(now.getMonth() - 6);
        const roleLimits = limits_config_1.LIMITS[role]?.[plan] || {};
        if (action === 'upload_artwork' && (role === 'artist' || role === 'collector')) {
            const baseLimit = roleLimits.artworks_per_month || 0;
            const extra = user.extras?.includes('extra_artworks') ? roleLimits.extra_artworks || 0 : 0;
            const totalLimit = baseLimit + extra;
            if (totalLimit > 0) {
                const count = await this.prisma.post.count({
                    where: {
                        userId,
                        type: 'artwork',
                        createdAt: { gte: monthStart }
                    },
                });
                if (count >= totalLimit) {
                    throw new common_1.ForbiddenException(`Bu ay ${totalLimit} eser yükleme hakkınıza ulaştınız.`);
                }
            }
        }
        if (action === 'create_collection' && role === 'collector') {
            const limit = roleLimits.collections_per_month || 0;
            if (limit > 0) {
                const count = await this.prisma.collection.count({
                    where: { ownerId: userId, createdAt: { gte: monthStart } },
                });
                if (count >= limit) {
                    throw new common_1.ForbiddenException(`Bu ay ${limit} koleksiyon oluşturma hakkınıza ulaştınız.`);
                }
            }
        }
        if (action === 'create_job' && role === 'corporate') {
            const limit = roleLimits.job_posts_per_month || 0;
            if (limit > 0) {
                const count = await this.prisma.jobListing.count({
                    where: { createdById: userId, createdAt: { gte: monthStart } },
                });
                if (count >= limit) {
                    throw new common_1.ForbiddenException(`Bu ay ${limit} iş ilanı oluşturma hakkınıza ulaştınız.`);
                }
            }
        }
    }
};
exports.LimitsService = LimitsService;
exports.LimitsService = LimitsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LimitsService);
//# sourceMappingURL=limits.service.js.map