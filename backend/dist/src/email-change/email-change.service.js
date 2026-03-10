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
exports.EmailChangeService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const mail_service_1 = require("../mail/mail.service");
const crypto_1 = require("crypto");
let EmailChangeService = class EmailChangeService {
    constructor(prisma, mailService) {
        this.prisma = prisma;
        this.mailService = mailService;
    }
    async requestEmailChange(userId, newEmail) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        if (user.email.toLowerCase() === newEmail.toLowerCase()) {
            throw new common_1.BadRequestException('Yeni e-posta adresi mevcut e-posta ile aynı olamaz.');
        }
        const existingUser = await this.prisma.user.findUnique({
            where: { email: newEmail.toLowerCase() },
        });
        if (existingUser) {
            throw new common_1.BadRequestException('Bu e-posta adresi zaten kullanılıyor.');
        }
        await this.prisma.emailChangeRequest.deleteMany({
            where: { userId },
        });
        const token = (0, crypto_1.randomBytes)(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        await this.prisma.emailChangeRequest.create({
            data: {
                userId,
                newEmail: newEmail.toLowerCase(),
                token,
                expiresAt,
            },
        });
        try {
            const confirmUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/email-change/confirm?token=${token}`;
            await this.mailService.sendEmailChangeConfirmation({
                to: newEmail,
                userName: user.fullName || user.username,
                confirmUrl,
            });
        }
        catch (error) {
            console.error('Failed to send email change confirmation:', error);
        }
        try {
            await this.mailService.sendEmailChangeNotification({
                to: user.email,
                userName: user.fullName || user.username,
                newEmail: newEmail.toLowerCase(),
            });
        }
        catch (error) {
            console.error('Failed to send email change notification:', error);
        }
        return {
            message: 'E-posta değişiklik talebi oluşturuldu. Yeni e-posta adresinize gönderilen bağlantıya tıklayarak değişikliği onaylayın.',
        };
    }
    async confirmEmailChange(token) {
        const request = await this.prisma.emailChangeRequest.findUnique({
            where: { token },
            include: { user: true },
        });
        if (!request) {
            throw new common_1.NotFoundException('Geçersiz veya süresi dolmuş bağlantı.');
        }
        if (new Date() > request.expiresAt) {
            await this.prisma.emailChangeRequest.delete({
                where: { id: request.id },
            });
            throw new common_1.BadRequestException('Bu bağlantının süresi dolmuş. Lütfen yeni bir e-posta değişiklik talebi oluşturun.');
        }
        const existingUser = await this.prisma.user.findUnique({
            where: { email: request.newEmail },
        });
        if (existingUser) {
            await this.prisma.emailChangeRequest.delete({
                where: { id: request.id },
            });
            throw new common_1.BadRequestException('Bu e-posta adresi artık kullanılıyor.');
        }
        await this.prisma.user.update({
            where: { id: request.userId },
            data: {
                email: request.newEmail,
            },
        });
        await this.prisma.emailChangeRequest.delete({
            where: { id: request.id },
        });
        return {
            message: 'E-posta adresiniz başarıyla değiştirildi.',
        };
    }
    async getPendingEmailChange(userId) {
        const request = await this.prisma.emailChangeRequest.findFirst({
            where: {
                userId,
                expiresAt: {
                    gt: new Date(),
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
        return request
            ? {
                newEmail: request.newEmail,
                expiresAt: request.expiresAt,
            }
            : null;
    }
    async resendConfirmationEmail(userId) {
        const request = await this.prisma.emailChangeRequest.findFirst({
            where: {
                userId,
                expiresAt: {
                    gt: new Date(),
                },
            },
            include: { user: true },
            orderBy: {
                createdAt: 'desc',
            },
        });
        if (!request) {
            throw new common_1.NotFoundException('Aktif e-posta değişiklik talebi bulunamadı.');
        }
        try {
            const confirmUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/email-change/confirm?token=${request.token}`;
            await this.mailService.sendEmailChangeConfirmation({
                to: request.newEmail,
                userName: request.user.fullName || request.user.username,
                confirmUrl,
            });
        }
        catch (error) {
            console.error('Failed to resend email change confirmation:', error);
            throw new common_1.BadRequestException('E-posta gönderilemedi. Lütfen daha sonra tekrar deneyin.');
        }
        return {
            message: 'Doğrulama e-postası yeniden gönderildi.',
        };
    }
};
exports.EmailChangeService = EmailChangeService;
exports.EmailChangeService = EmailChangeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mail_service_1.MailService])
], EmailChangeService);
//# sourceMappingURL=email-change.service.js.map