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
    updateReportStatus(reportId: string, body: {
        status: string;
    }): Promise<{
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
}
