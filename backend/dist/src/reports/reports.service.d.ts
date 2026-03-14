import { PrismaService } from '../prisma/prisma.service';
import { ReportReason } from '@prisma/client';
import { MailService } from '../mail/mail.service';
export declare class ReportsService {
    private prisma;
    private mailService;
    constructor(prisma: PrismaService, mailService: MailService);
    createReport(reporterId: string, reportedUserId: string, reason: ReportReason, conversationId?: string, messageId?: string, note?: string): Promise<{
        reporter: {
            username: string;
            fullName: string;
            id: string;
            avatar: string;
        };
        reportedUser: {
            username: string;
            fullName: string;
            id: string;
            avatar: string;
        };
    } & {
        messageId: string;
        id: string;
        createdAt: Date;
        status: string;
        conversationId: string;
        reporterId: string;
        reportedUserId: string;
        reason: import(".prisma/client").$Enums.ReportReason;
        note: string;
    }>;
    getReports(status?: string, page?: number, limit?: number): Promise<{
        reports: ({
            reporter: {
                username: string;
                fullName: string;
                id: string;
                avatar: string;
            };
            reportedUser: {
                username: string;
                fullName: string;
                id: string;
                avatar: string;
            };
        } & {
            messageId: string;
            id: string;
            createdAt: Date;
            status: string;
            conversationId: string;
            reporterId: string;
            reportedUserId: string;
            reason: import(".prisma/client").$Enums.ReportReason;
            note: string;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    updateReportStatus(reportId: string, status: string): Promise<{
        reporter: {
            email: string;
            username: string;
            fullName: string;
            id: string;
            avatar: string;
        };
        reportedUser: {
            username: string;
            fullName: string;
            id: string;
            avatar: string;
        };
    } & {
        messageId: string;
        id: string;
        createdAt: Date;
        status: string;
        conversationId: string;
        reporterId: string;
        reportedUserId: string;
        reason: import(".prisma/client").$Enums.ReportReason;
        note: string;
    }>;
    private sendReportResolvedEmail;
    getReportById(reportId: string): Promise<{
        reporter: {
            username: string;
            fullName: string;
            id: string;
            avatar: string;
        };
        reportedUser: {
            username: string;
            fullName: string;
            id: string;
            avatar: string;
        };
    } & {
        messageId: string;
        id: string;
        createdAt: Date;
        status: string;
        conversationId: string;
        reporterId: string;
        reportedUserId: string;
        reason: import(".prisma/client").$Enums.ReportReason;
        note: string;
    }>;
    createContentReport(reporterId: string, contentType: 'post' | 'comment', contentId: string, reason: ReportReason, note?: string): Promise<any>;
}
