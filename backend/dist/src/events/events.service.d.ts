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
        id: string;
        createdAt: Date;
        price: number;
        updatedAt: Date;
        date: Date;
        isDeleted: boolean;
        deletedAt: Date;
        title: string;
        location: string;
        coverImage: string;
        description: string;
        ownerId: string;
        participantCount: number;
        maxParticipants: number;
        ticketUrl: string;
        isFree: boolean;
        reminderMailSent: boolean;
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
        id: string;
        createdAt: Date;
        price: number;
        updatedAt: Date;
        date: Date;
        isDeleted: boolean;
        deletedAt: Date;
        title: string;
        location: string;
        coverImage: string;
        description: string;
        ownerId: string;
        participantCount: number;
        maxParticipants: number;
        ticketUrl: string;
        isFree: boolean;
        reminderMailSent: boolean;
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
            createdAt: Date;
            updatedAt: Date;
            city: string;
            gender: string;
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
            isDeleted: boolean;
            deletedAt: Date;
            deletedBy: string;
        };
    } & {
        id: string;
        createdAt: Date;
        eventId: string;
        authorId: string;
        text: string;
    })[]>;
    createEventComment(userId: string, eventId: string, data: {
        text: string;
    }): Promise<{
        author: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            city: string;
            gender: string;
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
            isDeleted: boolean;
            deletedAt: Date;
            deletedBy: string;
        };
    } & {
        id: string;
        createdAt: Date;
        eventId: string;
        authorId: string;
        text: string;
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
        userId: string;
        createdAt: Date;
        eventId: string;
        status: import(".prisma/client").$Enums.EventParticipantStatus;
        reminderSentAt: Date;
        reminder24hSentAt: Date;
        reminder2hSentAt: Date;
    }>;
}
