import { PrismaService } from '../prisma/prisma.service';
import { LimitsService } from '../limits/limits.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../mail/mail.service';
import { CreateEventDto } from './dto/create-event.dto';
export declare class EventsService {
    private prisma;
    private readonly limitsService;
    private readonly notificationsService;
    private readonly mailService;
    constructor(prisma: PrismaService, limitsService: LimitsService, notificationsService: NotificationsService, mailService: MailService);
    private mapEventForApi;
    getAllEvents(): Promise<(Record<string, unknown> & {
        approvedParticipantsCount: number;
        capacity: number;
    })[]>;
    getMyEvents(userId: string): Promise<(Record<string, unknown> & {
        approvedParticipantsCount: number;
        capacity: number;
    })[]>;
    findByAuthor(authorId: string): Promise<(Record<string, unknown> & {
        approvedParticipantsCount: number;
        capacity: number;
    })[]>;
    createEvent(userId: string, dto: CreateEventDto): Promise<{
        date: Date;
        participantCount: number;
        maxParticipants: number;
        id: string;
        title: string;
        description: string;
        coverImage: string;
        ticketUrl: string;
        price: number;
        isFree: boolean;
        location: string;
        ownerId: string;
        reminderMailSent: boolean;
        isDeleted: boolean;
        deletedAt: Date;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateEvent(userId: string, id: string, data: {
        title?: string;
        description?: string;
        date?: string;
        coverImage?: string;
        price?: number;
        isFree?: boolean;
        location?: string;
        maxParticipants?: number | null;
    }): Promise<{
        date: Date;
        participantCount: number;
        maxParticipants: number;
        id: string;
        title: string;
        description: string;
        coverImage: string;
        ticketUrl: string;
        price: number;
        isFree: boolean;
        location: string;
        ownerId: string;
        reminderMailSent: boolean;
        isDeleted: boolean;
        deletedAt: Date;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deleteEvent(userId: string, id: string): Promise<{
        success: boolean;
    }>;
    getEvent(id: string, viewerId?: string): Promise<Record<string, unknown> & {
        approvedParticipantsCount: number;
        capacity: number;
    }>;
    joinEvent(userId: string, eventId: string): Promise<Record<string, unknown> & {
        approvedParticipantsCount: number;
        capacity: number;
    }>;
    getEventComments(id: string): Promise<({
        author: {
            id: string;
            isDeleted: boolean;
            deletedAt: Date;
            createdAt: Date;
            updatedAt: Date;
            username: string;
            email: string;
            password: string;
            fullName: string;
            bio: string;
            avatar: string;
            roles: import(".prisma/client").$Enums.UserRole[];
            extras: string[];
            plan: import(".prisma/client").$Enums.SubscriptionPlan;
            badges: string[];
            isPrivate: boolean;
            isVerified: boolean;
            isAdmin: boolean;
            superAdmin: boolean;
            followerCount: number;
            followingCount: number;
            isOnline: boolean;
            lastSeen: Date;
            lastActiveAt: Date;
            passwordResetToken: string;
            passwordResetExpires: Date;
            usernameLastChangedAt: Date;
            nameLastChangedAt: Date;
            website: string;
            dateOfBirth: Date;
            country: string;
            city: string;
            gender: string;
            profileCompleted: boolean;
            phoneNumber: string;
            phoneVerified: boolean;
            gdprConsent: boolean;
            gdprConsentAt: Date;
            analyticsConsent: boolean;
            showProfileColorSignature: boolean;
            termsAccepted: boolean;
            termsAcceptedAt: Date;
            accountStatus: import(".prisma/client").$Enums.AccountStatus;
            suspendedAt: Date;
            suspendedUntil: Date;
            suspensionReason: string;
            suspensionNote: string;
            suspendedByAdminId: string;
            deletionRequestedAt: Date;
            scheduledDeletionAt: Date;
            deletedBy: string;
        };
    } & {
        text: string;
        id: string;
        createdAt: Date;
        eventId: string;
        authorId: string;
    })[]>;
    createEventComment(userId: string, eventId: string, data: {
        text: string;
    }): Promise<{
        author: {
            id: string;
            isDeleted: boolean;
            deletedAt: Date;
            createdAt: Date;
            updatedAt: Date;
            username: string;
            email: string;
            password: string;
            fullName: string;
            bio: string;
            avatar: string;
            roles: import(".prisma/client").$Enums.UserRole[];
            extras: string[];
            plan: import(".prisma/client").$Enums.SubscriptionPlan;
            badges: string[];
            isPrivate: boolean;
            isVerified: boolean;
            isAdmin: boolean;
            superAdmin: boolean;
            followerCount: number;
            followingCount: number;
            isOnline: boolean;
            lastSeen: Date;
            lastActiveAt: Date;
            passwordResetToken: string;
            passwordResetExpires: Date;
            usernameLastChangedAt: Date;
            nameLastChangedAt: Date;
            website: string;
            dateOfBirth: Date;
            country: string;
            city: string;
            gender: string;
            profileCompleted: boolean;
            phoneNumber: string;
            phoneVerified: boolean;
            gdprConsent: boolean;
            gdprConsentAt: Date;
            analyticsConsent: boolean;
            showProfileColorSignature: boolean;
            termsAccepted: boolean;
            termsAcceptedAt: Date;
            accountStatus: import(".prisma/client").$Enums.AccountStatus;
            suspendedAt: Date;
            suspendedUntil: Date;
            suspensionReason: string;
            suspensionNote: string;
            suspendedByAdminId: string;
            deletionRequestedAt: Date;
            scheduledDeletionAt: Date;
            deletedBy: string;
        };
    } & {
        text: string;
        id: string;
        createdAt: Date;
        eventId: string;
        authorId: string;
    }>;
    getParticipants(eventId: string, callerId: string): Promise<{
        id: string;
        username: string;
        fullName: string;
        avatar: string;
    }[]>;
    getPendingRequests(eventId: string, ownerId: string): Promise<{
        id: string;
        userId: string;
        status: import(".prisma/client").$Enums.EventParticipantStatus;
        createdAt: Date;
        user: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
        };
    }[]>;
    updateRequestStatus(eventId: string, requestUserId: string, ownerId: string, status: 'APPROVED' | 'REJECTED'): Promise<{
        user: {
            id: string;
            username: string;
            fullName: string;
            avatar: string;
        };
    } & {
        id: string;
        createdAt: Date;
        eventId: string;
        userId: string;
        status: import(".prisma/client").$Enums.EventParticipantStatus;
        reminderSentAt: Date;
        reminder24hSentAt: Date;
        reminder2hSentAt: Date;
    }>;
}
