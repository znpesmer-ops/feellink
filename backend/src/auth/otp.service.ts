import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHash, randomInt } from 'crypto';
import { OtpPurpose } from '@prisma/client';

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
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
   * Create OTP: generates code, stores hash. Does NOT invalidate previous OTPs so the
   * code from the first email still works if createOtp was accidentally called twice.
   * Returns plain code only for sending via email (do not persist or return to client).
   */
  async createOtp(email: string, purpose: OtpPurpose): Promise<string> {
    const normalizedEmail = email.trim().toLowerCase();
    const code = this.generateCode();
    const codeHash = this.hashCode(code);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

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
   * Verify OTP. Accepts any valid (unused, not expired) OTP for this email+purpose so that
   * the code from the first email works even if a second OTP was sent. Marks the matched
   * record as used. Throws on invalid/expired/locked.
   */
  async verifyOtp(email: string, purpose: OtpPurpose, code: string): Promise<boolean> {
    const normalizedEmail = email.trim().toLowerCase();
    const now = new Date();
    const inputHash = this.hashCode(code);

    const candidates = await this.prisma.emailOtp.findMany({
      where: {
        email: normalizedEmail,
        purpose,
        usedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!candidates.length) {
      throw new BadRequestException('Doğrulama kodu geçersiz veya süresi dolmuş. Lütfen yeni kod isteyin.');
    }

    const record = candidates.find((r) => r.codeHash === inputHash);
    if (!record) {
      const latest = candidates[0];
      const attemptCount = Math.min((latest.attemptCount ?? 0) + 1, MAX_ATTEMPTS);
      await this.prisma.emailOtp.update({
        where: { id: latest.id },
        data: { attemptCount },
      });
      if (attemptCount >= MAX_ATTEMPTS) {
        throw new BadRequestException('Çok fazla yanlış deneme. Lütfen yeni doğrulama kodu isteyin.');
      }
      throw new BadRequestException('Geçersiz doğrulama kodu. Lütfen tekrar deneyin.');
    }

    if (record.attemptCount >= MAX_ATTEMPTS) {
      throw new BadRequestException('Çok fazla yanlış deneme. Lütfen yeni doğrulama kodu isteyin.');
    }

    await this.prisma.emailOtp.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
    return true;
  }
}
