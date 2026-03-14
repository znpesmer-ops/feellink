import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHash, randomInt } from 'crypto';
import { OtpPurpose } from '@prisma/client';

const OTP_EXPIRY_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

@Injectable()
export class OtpService {
  constructor(private prisma: PrismaService) {}

  private hashCode(code: string): string {
    return createHash('sha256').update(code.trim()).digest('hex');
  }

  /** 6-digit numeric OTP */
  generateCode(): string {
    return String(randomInt(100000, 999999));
  }

  /**
   * Create OTP: generates code, stores hash, invalidates previous unused for same email+purpose.
   * Returns plain code only for sending via email (do not persist or return to client).
   */
  async createOtp(email: string, purpose: OtpPurpose): Promise<string> {
    const normalizedEmail = email.trim().toLowerCase();
    const code = this.generateCode();
    const codeHash = this.hashCode(code);
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

    // Invalidate any previous unused OTPs for this email+purpose
    await this.prisma.emailOtp.updateMany({
      where: {
        email: normalizedEmail,
        purpose,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });

    await this.prisma.emailOtp.create({
      data: {
        email: normalizedEmail,
        purpose,
        codeHash,
        expiresAt,
        attemptCount: 0,
      },
    });

    return code;
  }

  /**
   * Check if resend is allowed (last OTP created more than RESEND_COOLDOWN_SECONDS ago).
   */
  async canResend(email: string, purpose: OtpPurpose): Promise<boolean> {
    const normalizedEmail = email.trim().toLowerCase();
    const last = await this.prisma.emailOtp.findFirst({
      where: { email: normalizedEmail, purpose },
      orderBy: { createdAt: 'desc' },
    });
    if (!last) return true;
    const elapsed = (Date.now() - last.createdAt.getTime()) / 1000;
    return elapsed >= RESEND_COOLDOWN_SECONDS;
  }

  /**
   * Verify OTP. Returns true if valid and marks as used; throws on invalid/expired/locked.
   */
  async verifyOtp(email: string, purpose: OtpPurpose, code: string): Promise<boolean> {
    const normalizedEmail = email.trim().toLowerCase();
    const now = new Date();

    const record = await this.prisma.emailOtp.findFirst({
      where: {
        email: normalizedEmail,
        purpose,
        usedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new BadRequestException('Doğrulama kodu geçersiz veya süresi dolmuş. Lütfen yeni kod isteyin.');
    }

    if (record.attemptCount >= MAX_ATTEMPTS) {
      throw new BadRequestException('Çok fazla yanlış deneme. Lütfen yeni doğrulama kodu isteyin.');
    }

    const inputHash = this.hashCode(code);
    if (inputHash !== record.codeHash) {
      await this.prisma.emailOtp.update({
        where: { id: record.id },
        data: { attemptCount: record.attemptCount + 1 },
      });
      throw new BadRequestException('Geçersiz doğrulama kodu. Lütfen tekrar deneyin.');
    }

    await this.prisma.emailOtp.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
    return true;
  }
}
