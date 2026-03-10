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
exports.AccountStatusGuard = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let AccountStatusGuard = class AccountStatusGuard {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async canActivate(context) {
        try {
            const request = context.switchToHttp().getRequest();
            const publicPaths = ['/', '/health'];
            if (publicPaths.includes(request.path)) {
                return true;
            }
            const user = request.user;
            if (!user || !user.id) {
                return true;
            }
            try {
                const prisma = this.prisma;
                const dbUser = await prisma.user.findUnique({
                    where: { id: user.id },
                    select: {
                        accountStatus: true,
                        suspendedUntil: true,
                        suspensionReason: true,
                    },
                });
                if (!dbUser) {
                    return true;
                }
                if (dbUser.accountStatus === 'SUSPENDED' &&
                    dbUser.suspendedUntil &&
                    new Date(dbUser.suspendedUntil) < new Date()) {
                    try {
                        await prisma.user.update({
                            where: { id: user.id },
                            data: {
                                accountStatus: 'ACTIVE',
                                suspendedAt: null,
                                suspendedUntil: null,
                                suspensionReason: null,
                                suspensionNote: null,
                                suspendedByAdminId: null,
                            },
                        });
                    }
                    catch (updateError) {
                        console.warn('AccountStatusGuard: Failed to update user status:', updateError);
                    }
                    return true;
                }
                if (dbUser.accountStatus === 'SUSPENDED') {
                    const method = request.method;
                    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
                        throw new common_1.ForbiddenException({
                            code: 'ACCOUNT_SUSPENDED',
                            message: 'Hesabınız geçici olarak askıya alınmıştır.',
                            reason: dbUser.suspensionReason || 'Belirtilmemiş',
                            until: dbUser.suspendedUntil || null,
                        });
                    }
                }
            }
            catch (dbError) {
                console.warn('AccountStatusGuard: Database error, allowing request:', dbError);
                return true;
            }
            return true;
        }
        catch (error) {
            console.warn('AccountStatusGuard: Error, allowing request:', error);
            return true;
        }
    }
};
exports.AccountStatusGuard = AccountStatusGuard;
exports.AccountStatusGuard = AccountStatusGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AccountStatusGuard);
//# sourceMappingURL=account-status.guard.js.map