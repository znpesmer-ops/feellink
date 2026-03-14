import { PrismaService } from '../prisma/prisma.service';
import { OtpPurpose } from '@prisma/client';
export interface CreateOtpResult {
    code: string;
    expiresAt: Date;
}
export declare class OtpService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    private hashCode;
    generateCode(): string;
    createOtp(email: string, purpose: OtpPurpose): Promise<CreateOtpResult>;
    canResend(email: string, purpose: OtpPurpose): Promise<boolean>;
    verifyOtp(email: string, purpose: OtpPurpose, code: string): Promise<boolean>;
}
