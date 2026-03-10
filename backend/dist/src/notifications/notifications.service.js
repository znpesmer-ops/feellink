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
exports.NotificationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const notifications_gateway_1 = require("./notifications.gateway");
let NotificationsService = class NotificationsService {
    constructor(prisma, notificationsQueue, notificationsGateway) {
        this.prisma = prisma;
        this.notificationsQueue = notificationsQueue;
        this.notificationsGateway = notificationsGateway;
    }
    async createNotification(data) {
        if (!this.notificationsQueue) {
            return await this.createNotificationSync(data);
        }
        try {
            await this.notificationsQueue.add('create-notification', data);
            return { queued: true };
        }
        catch (error) {
            console.warn('[NotificationsService] Queue error, using sync:', error);
            return await this.createNotificationSync(data);
        }
    }
    async createNotificationSync(data) {
        let message = data.message;
        if (!message && data.fromUserId) {
            const fromUser = await this.prisma.user.findUnique({
                where: { id: data.fromUserId },
                select: { username: true, fullName: true },
            });
            if (fromUser) {
                const displayName = fromUser.fullName || fromUser.username;
                switch (data.type) {
                    case 'like':
                        message = `gönderini beğendi`;
                        break;
                    case 'comment':
                        message = `gönderine yorum yaptı`;
                        break;
                    case 'reply':
                        message = `yorumuna yanıt verdi`;
                        break;
                    case 'comment_pinned':
                        message = `yorumun sabitlendi`;
                        break;
                    case 'comment_like':
                        message = `yorumunu beğendi`;
                        break;
                    case 'follow':
                        message = `seni takip etmeye başladı`;
                        break;
                    case 'follow_request':
                        message = `seni takip etmek istiyor`;
                        break;
                    case 'follow_accept':
                        message = `takip isteğini kabul etti`;
                        break;
                    case 'message':
                        message = `sana yeni bir mesaj gönderdi`;
                        break;
                    case 'mention':
                        message = `seni bir yorumda etiketledi`;
                        break;
                    case 'event_join':
                        message = `etkinliğinize katıldı`;
                        break;
                    case 'event_comment':
                        message = `etkinliğinize yorum yaptı`;
                        break;
                    case 'collection_added':
                        message = data.message || `koleksiyonuna eklendi`;
                        break;
                    default:
                        message = `yeni bir etkinlik gerçekleştirdi`;
                }
            }
        }
        const notification = await this.prisma.notification.create({
            data: {
                userId: data.userId,
                type: data.type,
                message: message,
                fromUserId: data.fromUserId,
                postId: data.postId,
                articleId: data.articleId,
                commentId: data.commentId,
                targetUrl: data.targetUrl,
                targetPath: data.targetPath,
                isRead: false,
            },
            include: {
                fromUser: {
                    select: {
                        id: true,
                        username: true,
                        fullName: true,
                        avatar: true,
                        isVerified: true,
                    },
                },
            },
        });
        const notificationData = {
            ...notification,
            sender: notification.fromUser || null,
        };
        this.notificationsGateway.notifyUser(data.userId, notificationData);
        return notification;
    }
    async getNotifications(userId, limit = 20, offset = 0) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { profileCompleted: true },
        });
        const notifications = await this.prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: offset,
            include: {
                fromUser: {
                    select: {
                        id: true,
                        username: true,
                        fullName: true,
                        avatar: true,
                        isVerified: true,
                    },
                },
            },
        });
        const filteredNotifications = notifications.filter((notification) => {
            if (notification.type === 'profile_incomplete' && user?.profileCompleted === true) {
                return false;
            }
            return true;
        });
        const unreadCount = await this.getUnreadCount(userId, user?.profileCompleted === true);
        const formattedNotifications = filteredNotifications.map((notification) => {
            const { fromUser, ...rest } = notification;
            return {
                ...rest,
                sender: fromUser || null,
                payload: {
                    fromUserId: notification.fromUserId,
                    postId: notification.postId,
                    commentId: notification.commentId,
                },
            };
        });
        return {
            notifications: formattedNotifications,
            unreadCount,
        };
    }
    async markAsRead(userId, notificationId) {
        const notification = await this.prisma.notification.findFirst({
            where: {
                id: notificationId,
                userId,
            },
        });
        if (!notification) {
            throw new Error('Notification not found or unauthorized');
        }
        if (notification.type === 'profile_incomplete') {
            return { count: 0 };
        }
        if (!notification.isRead) {
            const updated = await this.prisma.notification.updateMany({
                where: {
                    id: notificationId,
                    userId,
                },
                data: {
                    isRead: true,
                },
            });
            this.notificationsGateway.notifyNotificationRead(userId, notificationId);
            console.log(`✅ Notification marked as read: ${notificationId} for user ${userId}`);
            return updated;
        }
        return { count: 0 };
    }
    async markAllAsRead(userId) {
        await this.prisma.notification.updateMany({
            where: {
                userId,
                isRead: false,
                type: { not: 'profile_incomplete' },
            },
            data: {
                isRead: true,
            },
        });
        const unreadCount = await this.getUnreadCount(userId);
        return {
            success: true,
            unreadCount,
        };
    }
    async getUnreadCount(userId, excludeProfileIncomplete = false) {
        const whereClause = {
            userId,
            isRead: false,
        };
        if (excludeProfileIncomplete) {
            whereClause.type = { not: 'profile_incomplete' };
        }
        return this.prisma.notification.count({
            where: whereClause,
        });
    }
    async getPrefs(userId) {
        let prefs = await this.prisma.notificationPreference.findUnique({
            where: { userId },
        });
        if (!prefs) {
            prefs = await this.prisma.notificationPreference.create({
                data: { userId },
            });
        }
        return prefs;
    }
    async updatePrefs(userId, data) {
        return this.prisma.notificationPreference.upsert({
            where: { userId },
            create: {
                userId,
                mention: data.mention ?? true,
                follow: data.follow ?? true,
                like: data.like ?? true,
                comment: data.comment ?? true,
            },
            update: data,
        });
    }
    async isAllowed(toUserId, type) {
        const prefs = await this.getPrefs(toUserId);
        switch (type) {
            case 'mention':
                return prefs.mention;
            case 'follow':
            case 'follow_request':
            case 'follow_accept':
                return prefs.follow;
            case 'like':
                return prefs.like;
            case 'comment':
                return prefs.comment;
            default:
                return true;
        }
    }
    async createEventTicketNotification(eventId, buyerId) {
        try {
            const event = await this.prisma.event.findUnique({
                where: { id: eventId },
                include: { owner: true },
            });
            if (!event) {
                console.error('Event not found for notification:', eventId);
                return;
            }
            const buyer = await this.prisma.user.findUnique({
                where: { id: buyerId },
                select: { username: true, fullName: true },
            });
            if (!buyer) {
                console.error('Buyer not found for notification:', buyerId);
                return;
            }
            const buyerName = buyer.fullName || buyer.username;
            if (event.ownerId !== buyerId) {
                await this.createNotificationSync({
                    userId: event.ownerId,
                    type: 'event_ticket_purchased',
                    fromUserId: buyerId,
                    message: `${buyerName} "${event.title}" etkinliğiniz için bir bilet satın aldı.`,
                    targetUrl: `/events/${eventId}`,
                });
            }
            await this.createNotificationSync({
                userId: buyerId,
                type: 'ticket_confirmation',
                message: `"${event.title}" etkinliği için biletin oluşturuldu.`,
                targetUrl: `/my-tickets`,
            });
            console.log(`✅ Ticket notification created for event ${eventId} and buyer ${buyerId}`);
        }
        catch (error) {
            console.error('❌ Error creating ticket notification:', error);
        }
    }
};
exports.NotificationsService = NotificationsService;
exports.NotificationsService = NotificationsService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Optional)()),
    __param(1, (0, bullmq_1.InjectQueue)('notifications')),
    __param(2, (0, common_1.Inject)((0, common_1.forwardRef)(() => notifications_gateway_1.NotificationsGateway))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        bullmq_2.Queue,
        notifications_gateway_1.NotificationsGateway])
], NotificationsService);
//# sourceMappingURL=notifications.service.js.map