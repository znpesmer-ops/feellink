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
exports.EmailChangeController = void 0;
const common_1 = require("@nestjs/common");
const email_change_service_1 = require("./email-change.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let EmailChangeController = class EmailChangeController {
    constructor(emailChangeService) {
        this.emailChangeService = emailChangeService;
    }
    async requestEmailChange(user, body) {
        return this.emailChangeService.requestEmailChange(user.id, body.newEmail);
    }
    async confirmEmailChange(token) {
        return this.emailChangeService.confirmEmailChange(token);
    }
    async getPendingEmailChange(user) {
        return this.emailChangeService.getPendingEmailChange(user.id);
    }
    async resendConfirmationEmail(user) {
        return this.emailChangeService.resendConfirmationEmail(user.id);
    }
};
exports.EmailChangeController = EmailChangeController;
__decorate([
    (0, common_1.Post)('request'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], EmailChangeController.prototype, "requestEmailChange", null);
__decorate([
    (0, common_1.Get)('confirm'),
    __param(0, (0, common_1.Query)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], EmailChangeController.prototype, "confirmEmailChange", null);
__decorate([
    (0, common_1.Get)('pending'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EmailChangeController.prototype, "getPendingEmailChange", null);
__decorate([
    (0, common_1.Post)('resend'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], EmailChangeController.prototype, "resendConfirmationEmail", null);
exports.EmailChangeController = EmailChangeController = __decorate([
    (0, common_1.Controller)('email-change'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [email_change_service_1.EmailChangeService])
], EmailChangeController);
//# sourceMappingURL=email-change.controller.js.map