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
var EventsReminderService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsReminderService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const prisma_service_1 = require("../prisma/prisma.service");
const mail_service_1 = require("../mail/mail.service");
let EventsReminderService = EventsReminderService_1 = class EventsReminderService {
    constructor(prisma, mailService) {
        this.prisma = prisma;
        this.mailService = mailService;
        this.logger = new common_1.Logger(EventsReminderService_1.name);
    }
    async send24HourReminders() {
        try {
            const now = new Date();
            const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
            const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);
            const targets = await this.prisma.eventParticipant.findMany({
                where: {
                    status: 'APPROVED',
                    reminder24hSentAt: null,
                    event: {
                        date: {
                            gte: windowStart,
                            lt: windowEnd,
                        },
                        reminderMailSent: false,
                        isDeleted: false,
                        deletedAt: null,
                    },
                },
                include: {
                    user: {
                        select: {
                            email: true,
                            fullName: true,
                        },
                    },
                    event: {
                        select: {
                            id: true,
                            title: true,
                            date: true,
                            location: true,
                        },
                    },
                },
                take: 200,
            });
            if (!targets.length) {
                return;
            }
            this.logger.log(`📧 Found ${targets.length} participants to send 24-hour reminders`);
            const eventsMap = new Map();
            for (const target of targets) {
                const eventId = target.event.id;
                if (!eventsMap.has(eventId)) {
                    eventsMap.set(eventId, []);
                }
                eventsMap.get(eventId).push(target);
            }
            for (const [eventId, participants] of eventsMap.entries()) {
                let allSucceeded = true;
                const event = participants[0].event;
                for (const target of participants) {
                    try {
                        await this.mailService.sendEvent24HourReminder({
                            to: target.user.email,
                            name: target.user.fullName || '',
                            eventTitle: event.title,
                            eventDate: event.date,
                            location: event.location || undefined,
                            eventUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/events/${eventId}`,
                        });
                        await this.prisma.eventParticipant.update({
                            where: { id: target.id },
                            data: { reminder24hSentAt: new Date() },
                        });
                        this.logger.log(`✅ 24h reminder sent to ${target.user.email} for event: ${event.title}`);
                    }
                    catch (err) {
                        allSucceeded = false;
                        this.logger.error(`❌ 24h reminder failed: participant=${target.id} event=${eventId} user=${target.user.email}`, err);
                    }
                }
                if (allSucceeded && participants.length > 0) {
                    try {
                        await this.prisma.event.update({
                            where: { id: eventId },
                            data: { reminderMailSent: true },
                        });
                        this.logger.log(`✅ Event reminderMailSent flag set for event: ${event.title}`);
                    }
                    catch (err) {
                        this.logger.error(`❌ Failed to set reminderMailSent flag for event ${eventId}:`, err);
                    }
                }
            }
        }
        catch (error) {
            this.logger.error('❌ Error in send24HourReminders cron job:', error);
        }
    }
    async send2HourReminders() {
        try {
            const now = new Date();
            const windowStart = new Date(now.getTime() + 110 * 60 * 1000);
            const windowEnd = new Date(now.getTime() + 130 * 60 * 1000);
            const targets = await this.prisma.eventParticipant.findMany({
                where: {
                    status: 'APPROVED',
                    reminder2hSentAt: null,
                    event: {
                        date: { gte: windowStart, lt: windowEnd },
                        isDeleted: false,
                        deletedAt: null,
                    },
                },
                include: {
                    user: { select: { email: true, fullName: true } },
                    event: { select: { id: true, title: true, date: true, location: true } },
                },
                take: 200,
            });
            if (!targets.length)
                return;
            this.logger.log(`📧 Found ${targets.length} participants for 2-hour reminders`);
            const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            for (const target of targets) {
                try {
                    await this.mailService.sendEvent2HourReminder({
                        to: target.user.email,
                        name: target.user.fullName || '',
                        eventTitle: target.event.title,
                        eventDate: target.event.date,
                        location: target.event.location || undefined,
                        eventUrl: `${baseUrl}/events/${target.event.id}`,
                    });
                    await this.prisma.eventParticipant.update({
                        where: { id: target.id },
                        data: { reminder2hSentAt: new Date() },
                    });
                    this.logger.log(`✅ 2h reminder sent to ${target.user.email} for event: ${target.event.title}`);
                }
                catch (err) {
                    this.logger.error(`❌ 2h reminder failed: participant=${target.id} event=${target.event.id}`, err);
                }
            }
        }
        catch (error) {
            this.logger.error('Error in send2HourReminders cron job:', error);
        }
    }
    async send30MinReminders() {
        try {
            const now = new Date();
            const windowStart = new Date(now.getTime() + 29 * 60 * 1000);
            const windowEnd = new Date(now.getTime() + 31 * 60 * 1000);
            const targets = await this.prisma.eventParticipant.findMany({
                where: {
                    status: 'APPROVED',
                    reminderSentAt: null,
                    event: {
                        date: {
                            gte: windowStart,
                            lt: windowEnd,
                        },
                        isDeleted: false,
                        deletedAt: null,
                    },
                },
                include: {
                    user: {
                        select: {
                            email: true,
                            fullName: true,
                        },
                    },
                    event: {
                        select: {
                            id: true,
                            title: true,
                            date: true,
                            location: true,
                        },
                    },
                },
                take: 200,
            });
            if (!targets.length) {
                return;
            }
            this.logger.log(`Found ${targets.length} participants to send reminders for events starting in ~30 minutes`);
            for (const target of targets) {
                try {
                    await this.mailService.sendEventReminder({
                        to: target.user.email,
                        name: target.user.fullName || '',
                        eventTitle: target.event.title,
                        eventDate: target.event.date,
                        location: target.event.location || undefined,
                    });
                    await this.prisma.eventParticipant.update({
                        where: { id: target.id },
                        data: { reminderSentAt: new Date() },
                    });
                    this.logger.log(`Reminder sent to ${target.user.email} for event: ${target.event.title}`);
                }
                catch (err) {
                    this.logger.error(`Reminder failed: participant=${target.id} event=${target.event.id} user=${target.user.email}`, err);
                }
            }
        }
        catch (error) {
            this.logger.error('Error in send30MinReminders cron job:', error);
        }
    }
};
exports.EventsReminderService = EventsReminderService;
__decorate([
    (0, schedule_1.Cron)('0 * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EventsReminderService.prototype, "send24HourReminders", null);
__decorate([
    (0, schedule_1.Cron)('*/5 * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EventsReminderService.prototype, "send2HourReminders", null);
__decorate([
    (0, schedule_1.Cron)('*/1 * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], EventsReminderService.prototype, "send30MinReminders", null);
exports.EventsReminderService = EventsReminderService = EventsReminderService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mail_service_1.MailService])
], EventsReminderService);
//# sourceMappingURL=events-reminder.service.js.map