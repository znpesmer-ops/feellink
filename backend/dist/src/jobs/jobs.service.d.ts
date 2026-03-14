import { PrismaService } from '../prisma/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { LimitsService } from '../limits/limits.service';
import { CreateJobApplicationDto } from './dto/create-application.dto';
import { ApplicationStatus } from './dto/update-application-status.dto';
import { MailService } from '../mail/mail.service';
import { ChatService } from '../chat/chat.service';
export declare class JobsService {
    private readonly prisma;
    private readonly limitsService;
    private readonly mailService;
    private readonly chatService;
    private readonly logger;
    constructor(prisma: PrismaService, limitsService: LimitsService, mailService: MailService, chatService: ChatService);
    create(userId: string, dto: CreateJobDto): Promise<{
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
    update(jobId: string, userId: string, dto: CreateJobDto): Promise<{
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
    getAll(): Promise<({
        createdBy: {
            username: string;
            fullName: string;
            id: string;
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
    getMyJobs(userId: string): Promise<({
        _count: {
            applications: number;
        };
        createdBy: {
            username: string;
            fullName: string;
            id: string;
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
    getById(jobId: string, userId: string): Promise<{
        createdBy: {
            username: string;
            fullName: string;
            id: string;
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
    applyToJob(jobListingId: string, userId: string, dto: CreateJobApplicationDto): Promise<{
        applicant: {
            email: string;
            username: string;
            fullName: string;
            id: string;
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
    getApplicationsForJob(jobListingId: string, ownerId: string): Promise<{
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
            email: string;
            username: string;
            fullName: string;
            id: string;
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
    getMyApplications(userId: string): Promise<{
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
                username: string;
                fullName: string;
                id: string;
                avatar: string;
            };
        };
        coverLetter: string;
        portfolioUrl: string;
        portfolioFileUrl: string;
        cvUrl: string;
        status: import(".prisma/client").$Enums.ApplicationStatus;
    }[]>;
    updateApplicationStatus(applicationId: string, ownerId: string, status: ApplicationStatus): Promise<{
        jobListing: {
            id: string;
            title: string;
            company: string;
            createdBy: {
                email: string;
            };
        };
        applicant: {
            email: string;
            username: string;
            fullName: string;
            id: string;
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
    checkUserApplication(jobListingId: string, userId: string): Promise<{
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
    updateAdminNote(applicationId: string, ownerId: string, note: string | null): Promise<{
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
    updateTags(applicationId: string, ownerId: string, tags: string[]): Promise<{
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
    getApplicationActivities(applicationId: string, ownerId: string): Promise<{
        id: string;
        createdAt: Date;
        applicationId: string;
        action: string;
        details: string;
    }[]>;
    deleteJob(jobId: string, userId: string, isAdminUser: boolean): Promise<{
        success: boolean;
        message: string;
    }>;
    getOwnerListingsAnalytics(ownerId: string): Promise<{
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
}
