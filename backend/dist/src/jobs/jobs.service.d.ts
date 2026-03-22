import { PrismaService } from '../prisma/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { CreateJobApplicationDto } from './dto/create-application.dto';
import { ApplicationStatus } from './dto/update-application-status.dto';
import { MailService } from '../mail/mail.service';
import { ChatService } from '../chat/chat.service';
export declare class JobsService {
    private readonly prisma;
    private readonly mailService;
    private readonly chatService;
    private readonly logger;
    constructor(prisma: PrismaService, mailService: MailService, chatService: ChatService);
    create(userId: string, dto: CreateJobDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string;
        location: string;
        tags: string[];
        company: string;
        salary: string;
        createdById: string;
    }>;
    update(jobId: string, userId: string, dto: CreateJobDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string;
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
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string;
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
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string;
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
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string;
        description: string;
        location: string;
        tags: string[];
        company: string;
        salary: string;
        createdById: string;
    }>;
    applyToJob(jobListingId: string, userId: string, dto: CreateJobApplicationDto): Promise<{
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
        status: import(".prisma/client").$Enums.ApplicationStatus;
        reminderSentAt: Date;
        tags: string[];
        jobListingId: string;
        applicantId: string;
        coverLetter: string;
        portfolioUrl: string;
        portfolioFileUrl: string;
        cvUrl: string;
        conversationId: string;
        expiresAt: Date;
        adminNote: string;
    }>;
    getApplicationsForJob(jobListingId: string, ownerId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ApplicationStatus;
        coverLetter: string;
        portfolioUrl: string;
        portfolioFileUrl: string;
        cvUrl: string;
        expiresAt: Date;
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
    getMyApplications(userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ApplicationStatus;
        jobListing: {
            id: string;
            createdAt: Date;
            title: string;
            description: string;
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
        coverLetter: string;
        portfolioUrl: string;
        portfolioFileUrl: string;
        cvUrl: string;
        expiresAt: Date;
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
            id: string;
            username: string;
            email: string;
            fullName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ApplicationStatus;
        reminderSentAt: Date;
        tags: string[];
        jobListingId: string;
        applicantId: string;
        coverLetter: string;
        portfolioUrl: string;
        portfolioFileUrl: string;
        cvUrl: string;
        conversationId: string;
        expiresAt: Date;
        adminNote: string;
    }>;
    checkUserApplication(jobListingId: string, userId: string): Promise<{
        hasApplied: boolean;
        application: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.ApplicationStatus;
            reminderSentAt: Date;
            tags: string[];
            jobListingId: string;
            applicantId: string;
            coverLetter: string;
            portfolioUrl: string;
            portfolioFileUrl: string;
            cvUrl: string;
            conversationId: string;
            expiresAt: Date;
            adminNote: string;
        };
    }>;
    updateAdminNote(applicationId: string, ownerId: string, note: string | null): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ApplicationStatus;
        reminderSentAt: Date;
        tags: string[];
        jobListingId: string;
        applicantId: string;
        coverLetter: string;
        portfolioUrl: string;
        portfolioFileUrl: string;
        cvUrl: string;
        conversationId: string;
        expiresAt: Date;
        adminNote: string;
    }>;
    updateTags(applicationId: string, ownerId: string, tags: string[]): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.ApplicationStatus;
        reminderSentAt: Date;
        tags: string[];
        jobListingId: string;
        applicantId: string;
        coverLetter: string;
        portfolioUrl: string;
        portfolioFileUrl: string;
        cvUrl: string;
        conversationId: string;
        expiresAt: Date;
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
