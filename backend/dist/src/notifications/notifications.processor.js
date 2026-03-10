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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const notifications_service_1 = require("./notifications.service");
const notifications_gateway_1 = require("./notifications.gateway");
const prisma_service_1 = require("../prisma/prisma.service");
let NotificationsProcessor = class NotificationsProcessor extends bullmq_1.WorkerHost {
    constructor(notificationsService, notificationsGateway, prisma) {
        super();
        this.notificationsService = notificationsService;
        this.notificationsGateway = notificationsGateway;
        this.prisma = prisma;
    }
    async process(job) {
        const { name, data } = job;
        if (name === 'create-notification') {
            const notification = await this.notificationsService.createNotificationSync(data);
            return notification;
        }
        return null;
    }
};
exports.NotificationsProcessor = NotificationsProcessor;
exports.NotificationsProcessor = NotificationsProcessor = __decorate([
    (0, bullmq_1.Processor)('notifications'),
    __metadata("design:paramtypes", [notifications_service_1.NotificationsService,
        notifications_gateway_1.NotificationsGateway,
        prisma_service_1.PrismaService])
], NotificationsProcessor);
//# sourceMappingURL=notifications.processor.js.map