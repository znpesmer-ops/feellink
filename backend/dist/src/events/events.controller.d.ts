import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
export declare class EventsController {
    private eventsService;
    constructor(eventsService: EventsService);
    getAllEvents(): Promise<{
        events: (Record<string, unknown> & {
            approvedParticipantsCount: number;
            capacity: number;
        })[];
    }>;
    getMyEvents(user: any): Promise<(Record<string, unknown> & {
        approvedParticipantsCount: number;
        capacity: number;
    })[]>;
    getEvents(authorId?: string): Promise<(Record<string, unknown> & {
        approvedParticipantsCount: number;
        capacity: number;
    })[]>;
    getEvent(id: string, user?: {
        id: string;
    }): Promise<Record<string, unknown> & {
        approvedParticipantsCount: number;
        capacity: number;
    }>;
    createEvent(user: any, dto: CreateEventDto): Promise<{
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
    joinEvent(user: any, id: string): Promise<Record<string, unknown> & {
        approvedParticipantsCount: number;
        capacity: number;
    }>;
    getParticipants(id: string, user: any): Promise<{
        id: string;
        username: string;
        fullName: string;
        avatar: string;
    }[]>;
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
    createEventComment(user: any, id: string, data: any): Promise<{
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
    updateEvent(user: any, id: string, data: any): Promise<{
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
    deleteEvent(user: any, id: string): Promise<{
        success: boolean;
    }>;
    getPendingRequests(user: any, id: string): Promise<{
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
    updateRequestStatus(user: any, eventId: string, requestUserId: string, body: {
        status: 'APPROVED' | 'REJECTED';
    }): Promise<{
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
