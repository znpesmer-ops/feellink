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
        description: string;
        company: string;
        location: string;
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
        description: string;
        company: string;
        location: string;
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
        jobListing: {
            id: string;
            createdAt: Date;
            title: string;
            description: string;
            company: string;
            location: string;
            salary: string;
            tags: string[];
            createdBy: {
                id: string;
                username: string;
                fullName: string;
                avatar: string;
            };
        };
        coverLetter: string;
        portfolioUrl: string;
        portfolioFileUrl: string;
        cvUrl: string;
        status: import(".prisma/client").$Enums.ApplicationStatus;
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
        description: string;
        company: string;
        location: string;
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
        tags: string[];
        jobListingId: string;
        applicantId: string;
        coverLetter: string;
        portfolioUrl: string;
        portfolioFileUrl: string;
        cvUrl: string;
        status: import(".prisma/client").$Enums.ApplicationStatus;
        conversationId: string;
        reminderSentAt: Date;
        adminNote: string;
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
        tags: string[];
        jobListingId: string;
        applicantId: string;
        coverLetter: string;
        portfolioUrl: string;
        portfolioFileUrl: string;
        cvUrl: string;
        status: import(".prisma/client").$Enums.ApplicationStatus;
        conversationId: string;
        reminderSentAt: Date;
        adminNote: string;
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
        description: string;
        company: string;
        location: string;
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
        tags: string[];
        jobListingId: string;
        applicantId: string;
        coverLetter: string;
        portfolioUrl: string;
        portfolioFileUrl: string;
        cvUrl: string;
        status: import(".prisma/client").$Enums.ApplicationStatus;
        conversationId: string;
        reminderSentAt: Date;
        adminNote: string;
    }>;
    getApplicationsForJob(jobListingId: string, user: CurrentUserPayload): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        expiresAt: Date;
        coverLetter: string;
        portfolioUrl: string;
        portfolioFileUrl: string;
        cvUrl: string;
        status: import(".prisma/client").$Enums.ApplicationStatus;
        applicant: {
            id: string;
            username: string;
            email: string;
            fullName: string;
            avatar: string;
            roles: import(".prisma/client").$Enums.UserRole[];
        };
        activities: {
            id: string;
            createdAt: Date;
            applicationId: string;
            action: string;
            details: string;
        }[];
    }[]>;
    checkApplication(jobListingId: string, user: CurrentUserPayload): Promise<{
        hasApplied: boolean;
        application: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            expiresAt: Date;
            tags: string[];
            jobListingId: string;
            applicantId: string;
            coverLetter: string;
            portfolioUrl: string;
            portfolioFileUrl: string;
            cvUrl: string;
            status: import(".prisma/client").$Enums.ApplicationStatus;
            conversationId: string;
            reminderSentAt: Date;
            adminNote: string;
        };
    }>;
    updateJob(jobId: string, user: CurrentUserPayload, dto: CreateJobDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string;
        company: string;
        location: string;
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
