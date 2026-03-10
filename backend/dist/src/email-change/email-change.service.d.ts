import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
export declare class EmailChangeService {
    private prisma;
    private mailService;
    constructor(prisma: PrismaService, mailService: MailService);
    requestEmailChange(userId: string, newEmail: string): Promise<{
        message: string;
    }>;
    confirmEmailChange(token: string): Promise<{
        message: string;
    }>;
    getPendingEmailChange(userId: string): Promise<{
        newEmail: string;
        expiresAt: Date;
    }>;
    resendConfirmationEmail(userId: string): Promise<{
        message: string;
    }>;
}
