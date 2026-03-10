"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminModule = void 0;
const common_1 = require("@nestjs/common");
const admin_controller_1 = require("./admin.controller");
const admin_service_1 = require("./admin.service");
const admin_gateway_1 = require("./admin.gateway");
const prisma_module_1 = require("../prisma/prisma.module");
const reports_module_1 = require("../reports/reports.module");
const mail_module_1 = require("../mail/mail.module");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const posts_module_1 = require("../posts/posts.module");
let AdminModule = class AdminModule {
};
exports.AdminModule = AdminModule;
exports.AdminModule = AdminModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            reports_module_1.ReportsModule,
            mail_module_1.MailModule,
            jwt_1.JwtModule,
            config_1.ConfigModule,
            schedule_1.ScheduleModule.forRoot(),
            posts_module_1.PostsModule,
        ],
        controllers: [admin_controller_1.AdminController],
        providers: [admin_service_1.AdminService, admin_gateway_1.AdminGateway],
        exports: [admin_service_1.AdminService, admin_gateway_1.AdminGateway],
    })
], AdminModule);
//# sourceMappingURL=admin.module.js.map