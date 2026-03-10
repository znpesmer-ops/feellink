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
exports.FollowController = void 0;
const common_1 = require("@nestjs/common");
const follow_service_1 = require("./follow.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let FollowController = class FollowController {
    constructor(followService) {
        this.followService = followService;
    }
    async acceptRequest(userId, user) {
        return this.followService.acceptFollowRequest(user.id, userId);
    }
    async rejectRequest(userId, user) {
        return this.followService.rejectFollowRequest(user.id, userId);
    }
    async cancelRequest(userId, user) {
        return this.followService.cancelFollowRequest(user.id, userId);
    }
    async blockUser(userId, user) {
        return this.followService.blockUser(user.id, userId);
    }
    async unblockUser(userId, user) {
        return this.followService.unblockUser(user.id, userId);
    }
    async getFollowRequests(user) {
        return this.followService.getFollowRequests(user.id);
    }
    async getMyFollowers(user) {
        return this.followService.getFollowers(user.id, user.id);
    }
    async getMyFollowing(user) {
        return this.followService.getFollowing(user.id, user.id);
    }
    async getFollowers(userId, user) {
        return this.followService.getFollowers(userId, user.id);
    }
    async getFollowing(userId, user) {
        return this.followService.getFollowing(userId, user.id);
    }
    async removeFollower(userId, user) {
        return this.followService.removeFollower(user.id, userId);
    }
    async followUser(userId, user) {
        return this.followService.followUser(user.id, userId);
    }
    async unfollowUser(userId, user) {
        return this.followService.unfollowUser(user.id, userId);
    }
};
exports.FollowController = FollowController;
__decorate([
    (0, common_1.Post)('request/:userId/accept'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FollowController.prototype, "acceptRequest", null);
__decorate([
    (0, common_1.Post)('request/:userId/reject'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FollowController.prototype, "rejectRequest", null);
__decorate([
    (0, common_1.Post)('request/:userId/cancel'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FollowController.prototype, "cancelRequest", null);
__decorate([
    (0, common_1.Post)('block/:userId'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FollowController.prototype, "blockUser", null);
__decorate([
    (0, common_1.Delete)('block/:userId'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FollowController.prototype, "unblockUser", null);
__decorate([
    (0, common_1.Get)('requests'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FollowController.prototype, "getFollowRequests", null);
__decorate([
    (0, common_1.Get)('followers'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FollowController.prototype, "getMyFollowers", null);
__decorate([
    (0, common_1.Get)('following'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FollowController.prototype, "getMyFollowing", null);
__decorate([
    (0, common_1.Get)(':userId/followers'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FollowController.prototype, "getFollowers", null);
__decorate([
    (0, common_1.Get)(':userId/following'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FollowController.prototype, "getFollowing", null);
__decorate([
    (0, common_1.Delete)('remove-follower/:userId'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FollowController.prototype, "removeFollower", null);
__decorate([
    (0, common_1.Post)(':userId'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FollowController.prototype, "followUser", null);
__decorate([
    (0, common_1.Delete)(':userId'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FollowController.prototype, "unfollowUser", null);
exports.FollowController = FollowController = __decorate([
    (0, common_1.Controller)('follow'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [follow_service_1.FollowService])
], FollowController);
//# sourceMappingURL=follow.controller.js.map