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
let LimitsService = class LimitsService {
    constructor(prisma) {
        this.prisma = prisma;
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
        const { permissions } = capabilities;
        if (!permissions.canCreateEvents) {
            throw new common_1.ForbiddenException({
                statusCode: 403,
                code: 'LIMIT_REACHED',
                message: 'Bu hesap tipi ile etkinlik oluşturamazsınız.',
            });
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
        const { permissions } = capabilities;
        if (!permissions.canCreateArtworks) {
            throw new common_1.ForbiddenException({
                statusCode: 403,
                code: 'LIMIT_REACHED',
                message: 'Bu hesap tipi ile eser oluşturamazsınız.',
            });
        }
        return capabilities;
    }
};
exports.LimitsService = LimitsService;
exports.LimitsService = LimitsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LimitsService);
//# sourceMappingURL=limits.service.js.map