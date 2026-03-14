import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createHash, randomInt } from 'crypto';
import { OtpPurpose } from '@prisma/client';

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 60;

export interface CreateOtpResult {
  code: string;
  expiresAt: Date;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(private prisma: PrismaService) {}

  private hashCode(code: string): string {
    return createHash('sha256').update(code.trim()).digest('hex');
  }

  /** 6-digit numeric OTP */
  generateCode(): string {
    return String(randomInt(100000, 999999));
  }

  /**
   * Create OTP: revoke previous active (same email+purpose), then create new one.
   * Returns code and expiresAt so caller can send email and optionally return expiresAt to client.
   */
  async createOtp(email: string, purpose: OtpPurpose): Promise<CreateOtpResult> {
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

    await this.prisma.emailOtp.create({
      data: {
        email: normalizedEmail,
        purpose,
        codeHash,
        expiresAt,
        attemptCount: 0,
      },
    });

    return { code, expiresAt };
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
   * Verify OTP. Uses only the latest active (not used, not revoked) record.
   * Separate error messages for debugging; expiresAt checked in milliseconds.
   */
  async verifyOtp(email: string, purpose: OtpPurpose, code: string): Promise<boolean> {
    const normalizedEmail = email.trim().toLowerCase();
    const nowMs = Date.now();
    const inputHash = this.hashCode(code);

    const record = await this.prisma.emailOtp.findFirst({
      where: {
        email: normalizedEmail,
        purpose,
        usedAt: null,
        revokedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    this.logger.debug({
      email: normalizedEmail.slice(0, 3) + '***',
      purpose,
      now: new Date(nowMs).toISOString(),
      recordExpiresAt: record?.expiresAt?.toISOString?.() ?? null,
      recordCreatedAt: record?.createdAt?.toISOString?.() ?? null,
      found: !!record,
    });

    if (!record) {
      throw new BadRequestException('Aktif kod bulunamadı. Lütfen yeni kod isteyin.');
    }

    if (record.expiresAt.getTime() < nowMs) {
      throw new BadRequestException('Kodun süresi dolmuş. Lütfen yeni kod isteyin.');
    }

    if (record.attemptCount >= MAX_ATTEMPTS) {
      throw new BadRequestException('Çok fazla yanlış deneme. Lütfen yeni doğrulama kodu isteyin.');
    }

    if (inputHash !== record.codeHash) {
      await this.prisma.emailOtp.update({
        where: { id: record.id },
        data: { attemptCount: record.attemptCount + 1 },
      });
      throw new BadRequestException('Kod hatalı. Lütfen tekrar deneyin.');
    }

    await this.prisma.emailOtp.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
    return true;
  }
}
