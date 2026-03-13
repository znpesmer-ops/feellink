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
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("./users.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const update_role_selection_dto_1 = require("./dto/update-role-selection.dto");
const update_user_dto_1 = require("./dto/update-user.dto");
const complete_onboarding_dto_1 = require("./dto/complete-onboarding.dto");
const role_change_request_dto_1 = require("./dto/role-change-request.dto");
const update_username_dto_1 = require("./dto/update-username.dto");
let UsersController = class UsersController {
    constructor(usersService) {
        this.usersService = usersService;
    }
    async getSelf(user) {
        if (!user?.id) {
            throw new common_1.NotFoundException('Kullanıcı kimliği bulunamadı. Lütfen tekrar giriş yapın.');
        }
        return this.usersService.getSelf(user.id);
    }
    async getColorSignature(username) {
        if (!username || username === 'undefined' || username === 'null' || username === '[object Object]') {
            throw new common_1.NotFoundException('Geçersiz kullanıcı adı. Lütfen tekrar deneyin.');
        }
        return this.usersService.getColorSignature(username);
    }
    async getProfileAnalysis(username, user) {
        if (!username || username === 'undefined' || username === 'null' || username === '[object Object]') {
            throw new common_1.NotFoundException('Geçersiz kullanıcı adı. Lütfen tekrar deneyin.');
        }
        if (!user?.id) {
            throw new common_1.NotFoundException('Kullanıcı kimliği bulunamadı. Lütfen tekrar giriş yapın.');
        }
        return this.usersService.getProfileAnalysis(username, user.id);
    }
    async getProfile(username, user) {
        if (!username || username === 'undefined' || username === 'null' || username === '[object Object]') {
            throw new common_1.NotFoundException('Geçersiz kullanıcı adı. Lütfen tekrar deneyin.');
        }
        if (!user?.id) {
            throw new common_1.NotFoundException('Kullanıcı kimliği bulunamadı. Lütfen tekrar giriş yapın.');
        }
        return this.usersService.getProfile(username, user.id);
    }
    async updateUsername(user, data) {
        if (!user?.id) {
            throw new common_1.NotFoundException('Kullanıcı kimliği bulunamadı.');
        }
        try {
            const result = await this.usersService.updateUsername(user.id, data.username);
            return result;
        }
        catch (error) {
            if (error instanceof common_1.BadRequestException || error instanceof common_1.NotFoundException) {
                throw error;
            }
            console.error('❌ [updateUsername] Unexpected error:', error);
            throw new common_1.BadRequestException(error?.message || 'Kullanıcı adı güncellenemedi.');
        }
    }
    async updateProfile(user, data) {
        return this.usersService.updateProfile(user.id, data);
    }
    async completeOnboarding(user, data) {
        if (!user?.id) {
            throw new common_1.NotFoundException('Kullanıcı kimliği bulunamadı.');
        }
        return this.usersService.completeOnboarding(user.id, data);
    }
    async searchUsers(query, user) {
        return this.usersService.searchUsers(query, user.id);
    }
    async getSavedPosts(user) {
        return { message: 'Use /posts/saved endpoint' };
    }
    async getHighlights(user) {
        return this.usersService.getHighlights(user.id);
    }
    async updateMyRoles(user, data) {
        return this.usersService.updateRoles(user.id, data);
    }
    async updateMyPlan(user, data) {
        return this.usersService.updatePlan(user.id, data.plan);
    }
    async getMyCapabilities(user) {
        return this.usersService.getRoleCapabilities(user.id);
    }
    async getRoleOverview() {
        return this.usersService.getRolesOverview();
    }
    async blockUser(userId, user) {
        if (!user?.id) {
            throw new common_1.NotFoundException('Kullanıcı kimliği bulunamadı.');
        }
        return this.usersService.blockUser(user.id, userId);
    }
    async unblockUser(userId, user) {
        if (!user?.id) {
            throw new common_1.NotFoundException('Kullanıcı kimliği bulunamadı.');
        }
        return this.usersService.unblockUser(user.id, userId);
    }
    async getBlockedUsers(user) {
        if (!user?.id) {
            throw new common_1.NotFoundException('Kullanıcı kimliği bulunamadı.');
        }
        return this.usersService.getBlockedUsers(user.id);
    }
    async deleteAccount(user) {
        if (!user?.id) {
            throw new common_1.NotFoundException('Kullanıcı kimliği bulunamadı.');
        }
        return this.usersService.deleteAccount(user.id);
    }
    async getSavedArtworks(userId, user) {
        if (userId !== user.id) {
            throw new common_1.NotFoundException('Kullanıcı bulunamadı.');
        }
        return this.usersService.getSavedArtworks(userId);
    }
    async getSaved(userId, user) {
        if (userId !== user.id) {
            throw new common_1.NotFoundException('Kullanıcı bulunamadı.');
        }
        return this.usersService.getSaved(userId);
    }
    async verifyPhone(user, data) {
        if (!user?.id) {
            throw new common_1.NotFoundException('Kullanıcı kimliği bulunamadı.');
        }
        return this.usersService.verifyPhone(user.id, data.code);
    }
    async resendPhoneCode(user) {
        if (!user?.id) {
            throw new common_1.NotFoundException('Kullanıcı kimliği bulunamadı.');
        }
        return this.usersService.resendPhoneCode(user.id);
    }
    async createRoleChangeRequest(user, dto) {
        if (!user?.id) {
            throw new common_1.NotFoundException('Kullanıcı kimliği bulunamadı.');
        }
        return this.usersService.createRoleChangeRequest(user.id, dto);
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getSelf", null);
__decorate([
    (0, common_1.Get)('profile/:username/color-signature'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('username')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getColorSignature", null);
__decorate([
    (0, common_1.Get)('profile/:username/analysis'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('username')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getProfileAnalysis", null);
__decorate([
    (0, common_1.Get)('profile/:username'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('username')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Patch)('me/username'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_username_dto_1.UpdateUsernameDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateUsername", null);
__decorate([
    (0, common_1.Put)('profile'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_user_dto_1.UpdateUserDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateProfile", null);
__decorate([
    (0, common_1.Post)('me/complete-onboarding'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, complete_onboarding_dto_1.CompleteOnboardingDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "completeOnboarding", null);
__decorate([
    (0, common_1.Get)('search'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "searchUsers", null);
__decorate([
    (0, common_1.Get)('me/saved'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getSavedPosts", null);
__decorate([
    (0, common_1.Get)('highlights'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getHighlights", null);
__decorate([
    (0, common_1.Patch)('me/roles'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, update_role_selection_dto_1.UpdateRoleSelectionDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateMyRoles", null);
__decorate([
    (0, common_1.Patch)('me/plan'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateMyPlan", null);
__decorate([
    (0, common_1.Get)('me/capabilities'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getMyCapabilities", null);
__decorate([
    (0, common_1.Get)('roles/overview'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getRoleOverview", null);
__decorate([
    (0, common_1.Post)(':userId/block'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "blockUser", null);
__decorate([
    (0, common_1.Delete)(':userId/block'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "unblockUser", null);
__decorate([
    (0, common_1.Get)('me/blocked'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getBlockedUsers", null);
__decorate([
    (0, common_1.Delete)('account'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "deleteAccount", null);
__decorate([
    (0, common_1.Get)(':id/saved-artworks'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getSavedArtworks", null);
__decorate([
    (0, common_1.Get)(':id/saved'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "getSaved", null);
__decorate([
    (0, common_1.Post)('verify-phone'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "verifyPhone", null);
__decorate([
    (0, common_1.Post)('resend-phone-code'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "resendPhoneCode", null);
__decorate([
    (0, common_1.Post)('role-change-request'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, role_change_request_dto_1.RoleChangeRequestDto]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "createRoleChangeRequest", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);
//# sourceMappingURL=users.controller.js.map