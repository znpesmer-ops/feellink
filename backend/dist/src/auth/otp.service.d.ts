import { PrismaService } from '../prisma/prisma.service';
import { OtpPurpose } from '@prisma/client';
export declare class OtpService {
    private prisma;
    constructor(prisma: PrismaService);
    private hashCode;
    generateCode(): string;
    createOtp(email: string, purpose: OtpPurpose): Promise<string>;
    canResend(email: string, purpose: OtpPurpose): Promise<boolean>;
    verifyOtp(email: string, purpose: OtpPurpose, code: string): Promise<boolean>;
}
