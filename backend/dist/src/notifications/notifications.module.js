"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsModule = void 0;
const common_1 = require("@nestjs/common");
const notifications_controller_1 = require("./notifications.controller");
const notification_preferences_controller_1 = require("./notification-preferences.controller");
const notifications_service_1 = require("./notifications.service");
const prisma_module_1 = require("../prisma/prisma.module");
const bullmq_1 = require("@nestjs/bullmq");
const config_1 = require("@nestjs/config");
const notifications_processor_1 = require("./notifications.processor");
const notifications_gateway_1 = require("./notifications.gateway");
const redisHost = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT || '6379';
const isRedisAvailable = redisHost && redisHost !== 'localhost' && redisHost !== '127.0.0.1';
const bullModuleImports = isRedisAvailable
    ? [
        bullmq_1.BullModule.forRootAsync({
            imports: [config_1.ConfigModule],
            useFactory: async (configService) => ({
                connection: {
                    host: configService.get('REDIS_HOST'),
                    port: parseInt(configService.get('REDIS_PORT') || '6379'),
                    maxRetriesPerRequest: 0,
                    retryStrategy: () => null,
                },
            }),
            inject: [config_1.ConfigService],
        }),
        bullmq_1.BullModule.registerQueue({
            name: 'notifications',
        }),
    ]
    : [];
const providers = isRedisAvailable
    ? [notifications_service_1.NotificationsService, notifications_processor_1.NotificationsProcessor, notifications_gateway_1.NotificationsGateway]
    : [notifications_service_1.NotificationsService, notifications_gateway_1.NotificationsGateway];
let NotificationsModule = class NotificationsModule {
};
exports.NotificationsModule = NotificationsModule;
exports.NotificationsModule = NotificationsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            ...bullModuleImports,
        ],
        controllers: [notifications_controller_1.NotificationsController, notification_preferences_controller_1.NotificationPreferencesController],
        providers,
        exports: [notifications_service_1.NotificationsService, notifications_gateway_1.NotificationsGateway],
    })
], NotificationsModule);
//# sourceMappingURL=notifications.module.js.map