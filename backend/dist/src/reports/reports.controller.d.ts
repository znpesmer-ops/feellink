import { ReportsService } from './reports.service';
import { ReportReason } from '@prisma/client';
export declare class ReportsController {
    private reportsService;
    constructor(reportsService: ReportsService);
    createReport(user: any, body: {
        reportedUserId?: string;
        contentType?: 'post' | 'comment';
        contentId?: string;
        conversationId?: string;
        messageId?: string;
        reason: ReportReason;
        note?: string;
    }): Promise<any>;
    getReports(status?: string, page?: string, limit?: string): Promise<{
        reports: ({
            reporter: {
                id: string;
                username: string;
                fullName: string;
                avatar: string;
            };
            reportedUser: {
                id: string;
                username: string;
                fullName: string;
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
    getReportById(reportId: string): Promise<{
        reporter: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
        };
        reportedUser: {
            id: string;
            username: string;
            fullName: string;
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
    updateReportStatus(reportId: string, body: {
        status: string;
    }): Promise<{
        reporter: {
            id: string;
            username: string;
            email: string;
            fullName: string;
            avatar: string;
        };
        reportedUser: {
            id: string;
            username: string;
            fullName: string;
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
}
