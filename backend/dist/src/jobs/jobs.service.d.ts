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
        createdAt: Date;
        id: string;
        updatedAt: Date;
        description: string;
        title: string;
        location: string;
        tags: string[];
        company: string;
        salary: string;
        createdById: string;
    }>;
    update(jobId: string, userId: string, dto: CreateJobDto): Promise<{
        createdAt: Date;
        id: string;
        updatedAt: Date;
        description: string;
        title: string;
        location: string;
        tags: string[];
        company: string;
        salary: string;
        createdById: string;
    }>;
    getAll(): Promise<({
        createdBy: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
        };
    } & {
        createdAt: Date;
        id: string;
        updatedAt: Date;
        description: string;
        title: string;
        location: string;
        tags: string[];
        company: string;
        salary: string;
        createdById: string;
    })[]>;
    getMyJobs(userId: string): Promise<({
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
        createdAt: Date;
        id: string;
        updatedAt: Date;
        description: string;
        title: string;
        location: string;
        tags: string[];
        company: string;
        salary: string;
        createdById: string;
    })[]>;
    getById(jobId: string, userId: string): Promise<{
        createdBy: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
        };
    } & {
        createdAt: Date;
        id: string;
        updatedAt: Date;
        description: string;
        title: string;
        location: string;
        tags: string[];
        company: string;
        salary: string;
        createdById: string;
    }>;
    applyToJob(jobListingId: string, userId: string, dto: CreateJobApplicationDto): Promise<{
        applicant: {
            email: string;
            id: string;
            username: string;
            fullName: string;
            avatar: string;
        };
    } & {
        expiresAt: Date;
        createdAt: Date;
        id: string;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ApplicationStatus;
        reminderSentAt: Date;
        tags: string[];
        conversationId: string;
        coverLetter: string;
        portfolioUrl: string;
        portfolioFileUrl: string;
        cvUrl: string;
        adminNote: string;
        jobListingId: string;
        applicantId: string;
    }>;
    getApplicationsForJob(jobListingId: string, ownerId: string): Promise<{
        expiresAt: Date;
        createdAt: Date;
        id: string;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ApplicationStatus;
        coverLetter: string;
        portfolioUrl: string;
        portfolioFileUrl: string;
        cvUrl: string;
        activities: {
            createdAt: Date;
            id: string;
            applicationId: string;
            action: string;
            details: string;
        }[];
        applicant: {
            email: string;
            id: string;
            username: string;
            fullName: string;
            avatar: string;
            roles: import(".prisma/client").$Enums.UserRole[];
        };
    }[]>;
    getMyApplications(userId: string): Promise<{
        expiresAt: Date;
        createdAt: Date;
        id: string;
        updatedAt: Date;
        jobListing: {
            createdAt: Date;
            id: string;
            description: string;
            title: string;
            location: string;
            tags: string[];
            company: string;
            salary: string;
            createdBy: {
                id: string;
                username: string;
                fullName: string;
                avatar: string;
            };
        };
        status: import(".prisma/client").$Enums.ApplicationStatus;
        coverLetter: string;
        portfolioUrl: string;
        portfolioFileUrl: string;
        cvUrl: string;
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
            id: string;
            username: string;
            fullName: string;
        };
    } & {
        expiresAt: Date;
        createdAt: Date;
        id: string;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ApplicationStatus;
        reminderSentAt: Date;
        tags: string[];
        conversationId: string;
        coverLetter: string;
        portfolioUrl: string;
        portfolioFileUrl: string;
        cvUrl: string;
        adminNote: string;
        jobListingId: string;
        applicantId: string;
    }>;
    checkUserApplication(jobListingId: string, userId: string): Promise<{
        hasApplied: boolean;
        application: {
            expiresAt: Date;
            createdAt: Date;
            id: string;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.ApplicationStatus;
            reminderSentAt: Date;
            tags: string[];
            conversationId: string;
            coverLetter: string;
            portfolioUrl: string;
            portfolioFileUrl: string;
            cvUrl: string;
            adminNote: string;
            jobListingId: string;
            applicantId: string;
        };
    }>;
    updateAdminNote(applicationId: string, ownerId: string, note: string | null): Promise<{
        expiresAt: Date;
        createdAt: Date;
        id: string;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ApplicationStatus;
        reminderSentAt: Date;
        tags: string[];
        conversationId: string;
        coverLetter: string;
        portfolioUrl: string;
        portfolioFileUrl: string;
        cvUrl: string;
        adminNote: string;
        jobListingId: string;
        applicantId: string;
    }>;
    updateTags(applicationId: string, ownerId: string, tags: string[]): Promise<{
        expiresAt: Date;
        createdAt: Date;
        id: string;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ApplicationStatus;
        reminderSentAt: Date;
        tags: string[];
        conversationId: string;
        coverLetter: string;
        portfolioUrl: string;
        portfolioFileUrl: string;
        cvUrl: string;
        adminNote: string;
        jobListingId: string;
        applicantId: string;
    }>;
    getApplicationActivities(applicationId: string, ownerId: string): Promise<{
        createdAt: Date;
        id: string;
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
