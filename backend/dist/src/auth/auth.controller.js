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
var AuthController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const register_dto_1 = require("./dto/register.dto");
const login_dto_1 = require("./dto/login.dto");
const refresh_dto_1 = require("./dto/refresh.dto");
const role_dto_1 = require("./dto/role.dto");
const forgot_password_dto_1 = require("./dto/forgot-password.dto");
const reset_password_dto_1 = require("./dto/reset-password.dto");
const send_signup_otp_dto_1 = require("./dto/send-signup-otp.dto");
const verify_signup_otp_dto_1 = require("./dto/verify-signup-otp.dto");
const verify_reset_otp_dto_1 = require("./dto/verify-reset-otp.dto");
const reset_password_with_otp_dto_1 = require("./dto/reset-password-with-otp.dto");
const jwt_auth_guard_1 = require("./guards/jwt-auth.guard");
const current_user_decorator_1 = require("./decorators/current-user.decorator");
let AuthController = AuthController_1 = class AuthController {
    constructor(authService) {
        this.authService = authService;
        this.logger = new common_1.Logger(AuthController_1.name);
    }
    async register(registerDto, req, res) {
        this.logger.log(`Register RAW request body: ${JSON.stringify(req.body, null, 2)}`);
        this.logger.log(`Register DTO (after validation): ${JSON.stringify(registerDto, null, 2)}`);
        const result = await this.authService.register(registerDto);
        if ('refreshToken' in result && result.refreshToken) {
            res.cookie('refreshToken', result.refreshToken, {
                httpOnly: true,
                secure: false,
                sameSite: 'lax',
                path: '/',
                maxAge: 30 * 24 * 60 * 60 * 1000,
            });
        }
        return result;
    }
    async registerCorporate(registerDto, res) {
        const result = await this.authService.register({ ...registerDto, role: 'corporate' });
        if ('refreshToken' in result && result.refreshToken) {
            res.cookie('refreshToken', result.refreshToken, {
                httpOnly: true,
                secure: false,
                sameSite: 'lax',
                path: '/',
                maxAge: 30 * 24 * 60 * 60 * 1000,
            });
        }
        return result;
    }
    async dbCheck() {
        const ok = await this.authService.checkDatabase();
        return { ok };
    }
    async login(loginDto, res) {
        const result = await this.authService.login(loginDto);
        if (result.status !== 'DELETED_ACCOUNT' && result.refreshToken) {
            res.cookie('refreshToken', result.refreshToken, {
                httpOnly: true,
                secure: false,
                sameSite: 'lax',
                path: '/',
                maxAge: 30 * 24 * 60 * 60 * 1000,
            });
        }
        return result;
    }
    async corporateLogin(loginDto, res) {
        const result = await this.authService.corporateLogin(loginDto);
        if (result.status !== 'DELETED_ACCOUNT' && result.refreshToken) {
            res.cookie('refreshToken', result.refreshToken, {
                httpOnly: true,
                secure: false,
                sameSite: 'lax',
                path: '/',
                maxAge: 30 * 24 * 60 * 60 * 1000,
            });
        }
        return result;
    }
    async loginUnified(loginDto, res) {
        const result = await this.authService.loginUnified(loginDto);
        if (result.status !== 'DELETED_ACCOUNT' && result.refreshToken) {
            res.cookie('refreshToken', result.refreshToken, {
                httpOnly: true,
                secure: false,
                sameSite: 'lax',
                path: '/',
                maxAge: 30 * 24 * 60 * 60 * 1000,
            });
        }
        return result;
    }
    async restoreAccount(loginDto, res) {
        const result = await this.authService.restoreAccount(loginDto);
        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            path: '/',
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });
        return result;
    }
    async setRole(setRoleDto) {
        return this.authService.setUserRole(setRoleDto.userId, setRoleDto.role);
    }
    async refresh(refreshDto, req, res) {
        const refreshToken = req.cookies?.refreshToken || refreshDto.refreshToken;
        if (!refreshToken) {
            throw new common_1.UnauthorizedException('Refresh token not found');
        }
        const result = await this.authService.refreshTokens(refreshToken);
        res.cookie('refreshToken', result.refreshToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            path: '/',
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });
        return result;
    }
    async logout(refreshDto, req, res) {
        const refreshToken = req.cookies?.refreshToken || refreshDto.refreshToken;
        if (refreshToken) {
            await this.authService.logout(refreshToken);
        }
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            path: '/',
        });
        return { message: 'Logged out successfully' };
    }
    async logoutAll(user) {
        return this.authService.logoutAll(user.id);
    }
    async getCurrentUser(user) {
        return this.authService.getUserProfile(user.id);
    }
    async sendSignupOtp(dto) {
        return this.authService.sendSignupOtp(dto.email);
    }
    async verifySignupOtp(dto, res) {
        const result = await this.authService.verifySignupOtp(dto.email, dto.code);
        if (result.refreshToken) {
            res.cookie('refreshToken', result.refreshToken, {
                httpOnly: true,
                secure: false,
                sameSite: 'lax',
                path: '/',
                maxAge: 30 * 24 * 60 * 60 * 1000,
            });
        }
        return result;
    }
    async forgotPassword(dto) {
        return this.authService.forgotPassword(dto);
    }
    async verifyResetOtp(dto) {
        return this.authService.verifyResetOtp(dto.email, dto.code);
    }
    async resetPasswordWithOtp(dto) {
        return this.authService.resetPasswordWithOtp(dto.resetToken, dto.newPassword);
    }
    async resetPassword(dto) {
        return this.authService.resetPassword(dto);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_dto_1.RegisterDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.Post)('register-corporate'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_dto_1.RegisterDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "registerCorporate", null);
__decorate([
    (0, common_1.Get)('db-check'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "dbCheck", null);
__decorate([
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('login-corporate'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "corporateLogin", null);
__decorate([
    (0, common_1.Post)('login-unified'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "loginUnified", null);
__decorate([
    (0, common_1.Post)('restore-account'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "restoreAccount", null);
__decorate([
    (0, common_1.Post)('role'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [role_dto_1.SetRoleDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "setRole", null);
__decorate([
    (0, common_1.Post)('refresh'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [refresh_dto_1.RefreshDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('logout'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [refresh_dto_1.RefreshDto, Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Post)('logout-all'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logoutAll", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getCurrentUser", null);
__decorate([
    (0, common_1.Post)('send-signup-otp'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [send_signup_otp_dto_1.SendSignupOtpDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "sendSignupOtp", null);
__decorate([
    (0, common_1.Post)('verify-signup-otp'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [verify_signup_otp_dto_1.VerifySignupOtpDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifySignupOtp", null);
__decorate([
    (0, common_1.Post)('forgot-password'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [forgot_password_dto_1.ForgotPasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "forgotPassword", null);
__decorate([
    (0, common_1.Post)('verify-reset-otp'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [verify_reset_otp_dto_1.VerifyResetOtpDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyResetOtp", null);
__decorate([
    (0, common_1.Post)('reset-password-with-otp'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reset_password_with_otp_dto_1.ResetPasswordWithOtpDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPasswordWithOtp", null);
__decorate([
    (0, common_1.Post)('reset-password'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reset_password_dto_1.ResetPasswordDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPassword", null);
exports.AuthController = AuthController = AuthController_1 = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map