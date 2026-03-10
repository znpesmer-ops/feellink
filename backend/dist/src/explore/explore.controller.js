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
exports.ExploreController = void 0;
const common_1 = require("@nestjs/common");
const explore_service_1 = require("./explore.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let ExploreController = class ExploreController {
    constructor(exploreService) {
        this.exploreService = exploreService;
    }
    async getExplore(user, limit, cursor) {
        return this.exploreService.getExplorePosts(user?.id || null, limit ? parseInt(limit) : 20, cursor);
    }
    async searchHashtags(query, limit) {
        return this.exploreService.searchHashtags(query, limit ? parseInt(limit) : 20);
    }
    async getHashtagPosts(user, hashtag, limit, cursor) {
        const hashtagName = decodeURIComponent(hashtag);
        return this.exploreService.getHashtagPosts(hashtagName, user?.id || null, limit ? parseInt(limit) : 20, cursor);
    }
};
exports.ExploreController = ExploreController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('cursor')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], ExploreController.prototype, "getExplore", null);
__decorate([
    (0, common_1.Get)('hashtags'),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ExploreController.prototype, "searchHashtags", null);
__decorate([
    (0, common_1.Get)('hashtags/:hashtag/posts'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('hashtag')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('cursor')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", Promise)
], ExploreController.prototype, "getHashtagPosts", null);
exports.ExploreController = ExploreController = __decorate([
    (0, common_1.Controller)('explore'),
    __metadata("design:paramtypes", [explore_service_1.ExploreService])
], ExploreController);
//# sourceMappingURL=explore.controller.js.map