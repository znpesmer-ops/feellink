"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const limits_service_1 = require("../limits/limits.service");
const notifications_service_1 = require("../notifications/notifications.service");
const mail_service_1 = require("../mail/mail.service");
let EventsService = class EventsService {
    constructor(prisma, limitsService, notificationsService, mailService) {
        this.prisma = prisma;
        this.limitsService = limitsService;
        this.notificationsService = notificationsService;
        this.mailService = mailService;
    }
    mapEventForApi(event) {
        const count = typeof event.participantCount === 'number' ? event.participantCount : 0;
        const cap = event.maxParticipants !== undefined && event.maxParticipants !== null
            ? event.maxParticipants
            : null;
        return {
            ...event,
            approvedParticipantsCount: count,
            capacity: cap,
        };
    }
    async getAllEvents() {
        try {
            const events = await this.prisma.event.findMany({
                where: {
                    isDeleted: false,
                },
                include: {
                    tickets: true,
                    owner: {
                        select: {
                            id: true,
                            username: true,
                            fullName: true,
                            avatar: true,
                        },
                    },
                    participants: {
                        select: {
                            userId: true,
                            status: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });
            return events.map((e) => this.mapEventForApi(e));
        }
        catch (error) {
            console.error('Error fetching events:', error);
            return [];
        }
    }
    async getMyEvents(userId) {
        const list = await this.prisma.event.findMany({
            where: { ownerId: userId, isDeleted: false },
            orderBy: { date: 'desc' },
        });
        return list.map((e) => this.mapEventForApi(e));
    }
    async findByAuthor(authorId) {
        const list = await this.prisma.event.findMany({
            where: { ownerId: authorId, isDeleted: false },
            include: { tickets: true },
            orderBy: { createdAt: 'desc' },
        });
        return list.map((e) => this.mapEventForApi(e));
    }
    async createEvent(userId, dto) {
        await this.limitsService.ensureCanCreateEvent(userId);
        return this.prisma.event.create({
            data: {
                title: dto.title,
                description: dto.description,
                date: new Date(dto.date),
                coverImage: dto.coverImage,
                ticketUrl: dto.ticketUrl,
                price: dto.isFree ? 0 : (dto.price || 0),
                isFree: dto.isFree ?? true,
                location: dto.location,
                ownerId: userId,
                ...(dto.maxParticipants != null && dto.maxParticipants >= 1
                    ? { maxParticipants: dto.maxParticipants }
                    : {}),
            },
        });
    }
    async updateEvent(userId, id, data) {
        const event = await this.prisma.event.findUnique({
            where: { id },
        });
        if (!event) {
            throw new common_1.NotFoundException('Event not found');
        }
        if (event.ownerId !== userId) {
            throw new common_1.ForbiddenException('You do not have permission to update this event');
        }
        return this.prisma.event.update({
            where: { id },
            data: {
                title: data.title,
                description: data.description,
                date: data.date ? new Date(data.date) : undefined,
                coverImage: data.coverImage,
                price: data.isFree !== undefined ? (data.isFree ? 0 : (data.price || 0)) : undefined,
                isFree: data.isFree,
                location: data.location,
                ...(data.maxParticipants !== undefined
                    ? {
                        maxParticipants: data.maxParticipants === null || data.maxParticipants === undefined
                            ? null
                            : data.maxParticipants >= 1
                                ? data.maxParticipants
                                : null,
                    }
                    : {}),
            },
        });
    }
    async deleteEvent(userId, id) {
        const event = await this.prisma.event.findUnique({
            where: { id },
        });
        if (!event) {
            throw new common_1.NotFoundException('Event not found');
        }
        if (event.ownerId !== userId) {
            throw new common_1.ForbiddenException('You do not have permission to delete this event');
        }
        await this.prisma.event.update({
            where: { id },
            data: {
                isDeleted: true,
                deletedAt: new Date(),
            },
        });
        return { success: true };
    }
    async getEvent(id, viewerId) {
        const event = await this.prisma.event.findUnique({
            where: { id },
            include: {
                owner: true,
                participants: {
                    select: {
                        userId: true,
                        status: true,
                    },
                },
            },
        });
        if (!event || event.isDeleted) {
            throw new common_1.NotFoundException('Event not found');
        }
        const mapped = this.mapEventForApi({ ...event });
        const isOwner = viewerId && event.ownerId === viewerId;
        if (!isOwner && viewerId) {
            const viewerParticipation = event.participants.find((p) => p.userId === viewerId);
            return {
                ...mapped,
                participants: viewerParticipation ? [viewerParticipation] : [],
            };
        }
        if (!isOwner && !viewerId) {
            return {
                ...mapped,
                participants: [],
            };
        }
        return mapped;
    }
    async joinEvent(userId, eventId) {
        const existing = await this.prisma.eventParticipant.findUnique({
            where: {
                eventId_userId: {
                    eventId,
                    userId,
                },
            },
        });
        if (existing) {
            throw new common_1.ForbiddenException('Already joined this event');
        }
        const event = await this.prisma.event.findUnique({
            where: { id: eventId },
            select: {
                id: true,
                title: true,
                ownerId: true,
                isDeleted: true,
                participantCount: true,
                maxParticipants: true,
                owner: true,
            },
        });
        if (!event || event.isDeleted) {
            throw new common_1.NotFoundException('Event not found');
        }
        if (event.maxParticipants != null &&
            event.participantCount >= event.maxParticipants) {
            throw new common_1.ForbiddenException('Bu etkinliğin kontenjanı dolmuştur.');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { username: true, fullName: true, avatar: true },
        });
        await this.prisma.eventParticipant.create({
            data: {
                eventId,
                userId,
                status: 'PENDING',
            },
        });
        if (event.ownerId !== userId && user) {
            const userName = user.fullName || user.username;
            await this.notificationsService.createNotificationSync({
                userId: event.ownerId,
                type: 'event_request',
                fromUserId: userId,
                message: `${userName} "${event.title}" etkinliğinize katılım talebi gönderdi.`,
                targetUrl: `/events/${eventId}`,
            });
        }
        const after = await this.prisma.event.findUnique({
            where: { id: eventId },
        });
        return after
            ? this.mapEventForApi(after)
            : null;
    }
    async getEventComments(id) {
        return this.prisma.eventComment.findMany({
            where: { eventId: id },
            include: { author: true },
            orderBy: { createdAt: 'desc' },
        });
    }
    async createEventComment(userId, eventId, data) {
        const event = await this.prisma.event.findUnique({
            where: { id: eventId },
            include: { owner: true },
        });
        if (!event) {
            throw new common_1.NotFoundException('Event not found');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { username: true, fullName: true, avatar: true },
        });
        const comment = await this.prisma.eventComment.create({
            data: {
                text: data.text,
                eventId,
                authorId: userId,
            },
            include: { author: true },
        });
        if (event.ownerId !== userId && user) {
            const userName = user.fullName || user.username;
            await this.notificationsService.createNotificationSync({
                userId: event.ownerId,
                type: 'event_comment',
                fromUserId: userId,
                commentId: comment.id,
                message: `${userName} "${event.title}" etkinliğinize yorum yaptı.`,
                targetUrl: `/events/${eventId}`,
            });
        }
        return comment;
    }
    async getParticipants(eventId, callerId) {
        const event = await this.prisma.event.findUnique({
            where: { id: eventId },
            select: { ownerId: true },
        });
        if (!event) {
            throw new common_1.NotFoundException('Event not found');
        }
        if (event.ownerId !== callerId) {
            throw new common_1.ForbiddenException('Sadece etkinlik düzenleyicisi katılımcı listesini görebilir.');
        }
        const participants = await this.prisma.eventParticipant.findMany({
            where: { eventId, status: 'APPROVED' },
            include: { user: true },
            orderBy: { createdAt: 'desc' },
        });
        return participants.map((p) => ({
            id: p.user.id,
            username: p.user.username,
            fullName: p.user.fullName,
            avatar: p.user.avatar,
        }));
    }
    async getPendingRequests(eventId, ownerId) {
        const event = await this.prisma.event.findUnique({
            where: { id: eventId },
            select: { ownerId: true },
        });
        if (!event) {
            throw new common_1.NotFoundException('Event not found');
        }
        if (event.ownerId !== ownerId) {
            throw new common_1.ForbiddenException('You do not have permission to view requests for this event');
        }
        const requests = await this.prisma.eventParticipant.findMany({
            where: {
                eventId,
                status: 'PENDING',
            },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        fullName: true,
                        avatar: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return requests.map((r) => ({
            id: r.id,
            userId: r.userId,
            status: r.status,
            createdAt: r.createdAt,
            user: {
                id: r.user.id,
                username: r.user.username,
                fullName: r.user.fullName,
                avatar: r.user.avatar,
            },
        }));
    }
    async updateRequestStatus(eventId, requestUserId, ownerId, status) {
        const event = await this.prisma.event.findUnique({
            where: { id: eventId },
            select: {
                ownerId: true,
                title: true,
                participantCount: true,
                maxParticipants: true,
                isFree: true,
                price: true,
            },
        });
        if (!event) {
            throw new common_1.NotFoundException('Event not found');
        }
        if (event.ownerId !== ownerId) {
            throw new common_1.ForbiddenException('You do not have permission to update requests for this event');
        }
        const request = await this.prisma.eventParticipant.findUnique({
            where: {
                eventId_userId: {
                    eventId,
                    userId: requestUserId,
                },
            },
        });
        if (!request) {
            throw new common_1.NotFoundException('Request not found');
        }
        if (request.status !== 'PENDING') {
            throw new common_1.ForbiddenException('Request status cannot be changed');
        }
        if (status === 'APPROVED') {
            if (event.maxParticipants != null &&
                event.participantCount >= event.maxParticipants) {
                throw new common_1.ForbiddenException('Kontenjan dolduğu için onay verilemiyor.');
            }
        }
        const updated = await this.prisma.eventParticipant.update({
            where: {
                eventId_userId: {
                    eventId,
                    userId: requestUserId,
                },
            },
            data: { status },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        fullName: true,
                        avatar: true,
                    },
                },
            },
        });
        if (status === 'APPROVED') {
            await this.prisma.event.update({
                where: { id: eventId },
                data: { participantCount: { increment: 1 } },
            });
            await this.notificationsService.createNotificationSync({
                userId: requestUserId,
                type: 'event_request_approved',
                fromUserId: ownerId,
                message: `"${event.title}" etkinliğine yaptığınız talep onaylandı.`,
                targetUrl: `/events/${eventId}`,
            });
            const requester = await this.prisma.user.findUnique({
                where: { id: requestUserId },
                select: { email: true },
            });
            if (requester?.email) {
                await this.mailService.sendEventRequestApprovedEmail(requester.email, {
                    eventTitle: event.title,
                });
            }
        }
        return updated;
    }
};
exports.EventsService = EventsService;
exports.EventsService = EventsService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => notifications_service_1.NotificationsService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        limits_service_1.LimitsService,
        notifications_service_1.NotificationsService,
        mail_service_1.MailService])
], EventsService);
//# sourceMappingURL=events.service.js.map