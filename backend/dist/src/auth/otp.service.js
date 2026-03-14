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
var OtpService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OtpService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const crypto_1 = require("crypto");
const OTP_EXPIRY_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;
let OtpService = OtpService_1 = class OtpService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(OtpService_1.name);
    }
    hashCode(code) {
        return (0, crypto_1.createHash)('sha256').update(code.trim()).digest('hex');
    }
    generateCode() {
        return String((0, crypto_1.randomInt)(100000, 999999));
    }
    async createOtp(email, purpose) {
        const normalizedEmail = email.trim().toLowerCase();
        const code = this.generateCode();
        const codeHash = this.hashCode(code);
        const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
        await this.prisma.emailOtp.updateMany({
            where: {
                email: normalizedEmail,
                purpose,
                usedAt: null,
            },
            data: { revokedAt: new Date() },
        });
        const created = await this.prisma.emailOtp.create({
            data: {
                email: normalizedEmail,
                purpose,
                codeHash,
                expiresAt,
                attemptCount: 0,
                usedAt: null,
                revokedAt: null,
            },
        });
        this.logger.debug(`OTP CREATED: id=${created.id} email=${created.email} purpose=${created.purpose} expiresAt=${created.expiresAt.toISOString()} usedAt=${created.usedAt} revokedAt=${created.revokedAt}`);
        return { code, expiresAt };
    }
    async canResend(email, purpose) {
        const normalizedEmail = email.trim().toLowerCase();
        const last = await this.prisma.emailOtp.findFirst({
            where: { email: normalizedEmail, purpose },
            orderBy: { createdAt: 'desc' },
        });
        if (!last)
            return true;
        const elapsed = (Date.now() - last.createdAt.getTime()) / 1000;
        return elapsed >= RESEND_COOLDOWN_SECONDS;
    }
    async verifyOtp(email, purpose, code) {
        const normalizedEmail = email.trim().toLowerCase();
        const nowMs = Date.now();
        const inputHash = this.hashCode(code);
        const allForEmail = await this.prisma.emailOtp.findMany({
            where: { email: normalizedEmail, purpose },
            orderBy: { createdAt: 'desc' },
        });
        this.logger.debug(`VERIFY: email=${normalizedEmail.slice(0, 3)}*** purpose=${purpose} now=${new Date(nowMs).toISOString()} count=${allForEmail.length} ` +
            allForEmail.slice(0, 3).map((r) => `[id=${r.id} usedAt=${r.usedAt ?? 'null'} revokedAt=${r.revokedAt ?? 'null'} expiresAt=${r.expiresAt.toISOString()}]`).join(' '));
        const record = await this.prisma.emailOtp.findFirst({
            where: {
                email: normalizedEmail,
                purpose,
                usedAt: null,
                revokedAt: null,
            },
            orderBy: { createdAt: 'desc' },
        });
        if (!record) {
            throw new common_1.BadRequestException('Aktif kod bulunamadı. Lütfen yeni kod isteyin.');
        }
        if (record.expiresAt.getTime() < nowMs) {
            throw new common_1.BadRequestException('Kodun süresi dolmuş. Lütfen yeni kod isteyin.');
        }
        if (record.attemptCount >= MAX_ATTEMPTS) {
            throw new common_1.BadRequestException('Çok fazla yanlış deneme. Lütfen yeni doğrulama kodu isteyin.');
        }
        if (inputHash !== record.codeHash) {
            await this.prisma.emailOtp.update({
                where: { id: record.id },
                data: { attemptCount: record.attemptCount + 1 },
            });
            throw new common_1.BadRequestException('Kod hatalı. Lütfen tekrar deneyin.');
        }
        await this.prisma.emailOtp.update({
            where: { id: record.id },
            data: { usedAt: new Date() },
        });
        return true;
    }
};
exports.OtpService = OtpService;
exports.OtpService = OtpService = OtpService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OtpService);
//# sourceMappingURL=otp.service.js.map