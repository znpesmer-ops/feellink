import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UserRoleCode } from '../roles/roles.types';
import { CreateJobApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
type CurrentUserPayload = {
    id: string;
    roles?: UserRoleCode[];
    isAdmin?: boolean;
    superAdmin?: boolean;
};
export declare class JobsController {
    private readonly jobsService;
    constructor(jobsService: JobsService);
    create(user: CurrentUserPayload, dto: CreateJobDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        location: string;
        description: string;
        company: string;
        salary: string;
        tags: string[];
        createdById: string;
    }>;
    getPublicListings(): Promise<({
        createdBy: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        location: string;
        description: string;
        company: string;
        salary: string;
        tags: string[];
        createdById: string;
    })[]>;
    getMyListingsAnalytics(user: CurrentUserPayload): Promise<{
        totalApplications: number;
        totalPending: number;
        totalAccepted: number;
        totalRejected: number;
        totalListings: number;
        listings: {
            listingId: string;
            title: string;
            company: string;
            location: string;
            totalApplications: number;
            pending: number;
            accepted: number;
            rejected: number;
            reviewed: number;
            createdAt: Date;
        }[];
    }>;
    getMyApplications(user: CurrentUserPayload): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        expiresAt: Date;
        status: import(".prisma/client").$Enums.ApplicationStatus;
        coverLetter: string;
        portfolioUrl: string;
        portfolioFileUrl: string;
        cvUrl: string;
        jobListing: {
            id: string;
            createdAt: Date;
            title: string;
            location: string;
            description: string;
            company: string;
            salary: string;
            tags: string[];
            createdBy: {
                id: string;
                username: string;
                fullName: string;
                avatar: string;
            };
        };
    }[]>;
    getMyJobs(user: CurrentUserPayload): Promise<({
        _count: {
            applications: number;
        };
        createdBy: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        location: string;
        description: string;
        company: string;
        salary: string;
        tags: string[];
        createdById: string;
    })[]>;
    updateAdminNote(applicationId: string, user: CurrentUserPayload, body: {
        note: string | null;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        expiresAt: Date;
        conversationId: string;
        status: import(".prisma/client").$Enums.ApplicationStatus;
        reminderSentAt: Date;
        tags: string[];
        coverLetter: string;
        portfolioUrl: string;
        portfolioFileUrl: string;
        cvUrl: string;
        adminNote: string;
        jobListingId: string;
        applicantId: string;
    }>;
    getApplicationActivities(applicationId: string, user: CurrentUserPayload): Promise<{
        id: string;
        createdAt: Date;
        applicationId: string;
        action: string;
        details: string;
    }[]>;
    updateApplicationStatus(applicationId: string, user: CurrentUserPayload, dto: UpdateApplicationStatusDto): Promise<{
        jobListing: {
            id: string;
            title: string;
            company: string;
            createdBy: {
                email: string;
            };
        };
        applicant: {
            id: string;
            username: string;
            email: string;
            fullName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        expiresAt: Date;
        conversationId: string;
        status: import(".prisma/client").$Enums.ApplicationStatus;
        reminderSentAt: Date;
        tags: string[];
        coverLetter: string;
        portfolioUrl: string;
        portfolioFileUrl: string;
        cvUrl: string;
        adminNote: string;
        jobListingId: string;
        applicantId: string;
    }>;
    getJob(jobId: string, user: CurrentUserPayload): Promise<{
        createdBy: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        location: string;
        description: string;
        company: string;
        salary: string;
        tags: string[];
        createdById: string;
    }>;
    applyToJob(jobListingId: string, user: CurrentUserPayload, dto: CreateJobApplicationDto): Promise<{
        applicant: {
            id: string;
            username: string;
            email: string;
            fullName: string;
            avatar: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        expiresAt: Date;
        conversationId: string;
        status: import(".prisma/client").$Enums.ApplicationStatus;
        reminderSentAt: Date;
        tags: string[];
        coverLetter: string;
        portfolioUrl: string;
        portfolioFileUrl: string;
        cvUrl: string;
        adminNote: string;
        jobListingId: string;
        applicantId: string;
    }>;
    getApplicationsForJob(jobListingId: string, user: CurrentUserPayload): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        expiresAt: Date;
        status: import(".prisma/client").$Enums.ApplicationStatus;
        coverLetter: string;
        portfolioUrl: string;
        portfolioFileUrl: string;
        cvUrl: string;
        activities: {
            id: string;
            createdAt: Date;
            applicationId: string;
            action: string;
            details: string;
        }[];
        applicant: {
            id: string;
            username: string;
            email: string;
            fullName: string;
            avatar: string;
            roles: import(".prisma/client").$Enums.UserRole[];
        };
    }[]>;
    checkApplication(jobListingId: string, user: CurrentUserPayload): Promise<{
        hasApplied: boolean;
        application: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            expiresAt: Date;
            conversationId: string;
            status: import(".prisma/client").$Enums.ApplicationStatus;
            reminderSentAt: Date;
            tags: string[];
            coverLetter: string;
            portfolioUrl: string;
            portfolioFileUrl: string;
            cvUrl: string;
            adminNote: string;
            jobListingId: string;
            applicantId: string;
        };
    }>;
    updateJob(jobId: string, user: CurrentUserPayload, dto: CreateJobDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        location: string;
        description: string;
        company: string;
        salary: string;
        tags: string[];
        createdById: string;
    }>;
    deleteJob(jobId: string, user: CurrentUserPayload): Promise<{
        success: boolean;
        message: string;
    }>;
}
export {};
