import { PrismaService } from '../prisma/prisma.service';
import { ReportReason } from '@prisma/client';
import { MailService } from '../mail/mail.service';
export declare class ReportsService {
    private prisma;
    private mailService;
    constructor(prisma: PrismaService, mailService: MailService);
    createReport(reporterId: string, reportedUserId: string, reason: ReportReason, conversationId?: string, messageId?: string, note?: string): Promise<{
        reportedUser: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
        };
        reporter: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
        };
    } & {
        id: string;
        createdAt: Date;
        conversationId: string;
        status: string;
        messageId: string;
        reason: import(".prisma/client").$Enums.ReportReason;
        note: string;
        reportedUserId: string;
        reporterId: string;
    }>;
    getReports(status?: string, page?: number, limit?: number): Promise<{
        reports: ({
            reportedUser: {
                id: string;
                username: string;
                fullName: string;
                avatar: string;
            };
            reporter: {
                id: string;
                username: string;
                fullName: string;
                avatar: string;
            };
        } & {
            id: string;
            createdAt: Date;
            conversationId: string;
            status: string;
            messageId: string;
            reason: import(".prisma/client").$Enums.ReportReason;
            note: string;
            reportedUserId: string;
            reporterId: string;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    updateReportStatus(reportId: string, status: string): Promise<{
        reportedUser: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
        };
        reporter: {
            id: string;
            username: string;
            email: string;
            fullName: string;
            avatar: string;
        };
    } & {
        id: string;
        createdAt: Date;
        conversationId: string;
        status: string;
        messageId: string;
        reason: import(".prisma/client").$Enums.ReportReason;
        note: string;
        reportedUserId: string;
        reporterId: string;
    }>;
    private sendReportResolvedEmail;
    getReportById(reportId: string): Promise<{
        reportedUser: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
        };
        reporter: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
        };
    } & {
        id: string;
        createdAt: Date;
        conversationId: string;
        status: string;
        messageId: string;
        reason: import(".prisma/client").$Enums.ReportReason;
        note: string;
        reportedUserId: string;
        reporterId: string;
    }>;
    createContentReport(reporterId: string, contentType: 'post' | 'comment', contentId: string, reason: ReportReason, note?: string): Promise<any>;
}
