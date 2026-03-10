"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const passport_1 = require("@nestjs/passport");
const config_1 = require("@nestjs/config");
const auth_service_1 = require("./auth.service");
const auth_controller_1 = require("./auth.controller");
const jwt_strategy_1 = require("./strategies/jwt.strategy");
const account_status_guard_1 = require("./guards/account-status.guard");
const prisma_module_1 = require("../prisma/prisma.module");
const search_module_1 = require("../search/search.module");
const mail_module_1 = require("../mail/mail.module");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            passport_1.PassportModule,
            jwt_1.JwtModule.registerAsync({
                global: true,
                imports: [config_1.ConfigModule],
                useFactory: async (configService) => {
                    const jwtSecret = configService.get('JWT_SECRET') || 'default-secret-change-in-production';
                    if (!configService.get('JWT_SECRET')) {
                        console.warn('⚠️ JWT_SECRET not set, using default secret. This is insecure for production!');
                    }
                    return {
                        secret: jwtSecret,
                        signOptions: {
                            expiresIn: '15m',
                        },
                    };
                },
                inject: [config_1.ConfigService],
            }),
            prisma_module_1.PrismaModule,
            search_module_1.SearchModule,
            mail_module_1.MailModule,
        ],
        providers: [auth_service_1.AuthService, jwt_strategy_1.JwtStrategy, account_status_guard_1.AccountStatusGuard],
        controllers: [auth_controller_1.AuthController],
        exports: [auth_service_1.AuthService, account_status_guard_1.AccountStatusGuard],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map