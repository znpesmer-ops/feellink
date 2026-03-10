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
exports.SidebarController = void 0;
const common_1 = require("@nestjs/common");
const sidebar_service_1 = require("./sidebar.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let SidebarController = class SidebarController {
    constructor(sidebarService) {
        this.sidebarService = sidebarService;
    }
    async getGlobalSidebarData() {
        return this.sidebarService.getGlobalData();
    }
    async getExplorePosts(user, limit) {
        const limitNum = limit ? parseInt(limit, 10) : 5;
        return this.sidebarService.getExplorePosts(user.id, limitNum);
    }
    async getFeaturedHighlights() {
        return this.sidebarService.getFeaturedHighlights();
    }
};
exports.SidebarController = SidebarController;
__decorate([
    (0, common_1.Get)('global'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SidebarController.prototype, "getGlobalSidebarData", null);
__decorate([
    (0, common_1.Get)('explore/posts'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SidebarController.prototype, "getExplorePosts", null);
__decorate([
    (0, common_1.Get)('featured'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SidebarController.prototype, "getFeaturedHighlights", null);
exports.SidebarController = SidebarController = __decorate([
    (0, common_1.Controller)('sidebar'),
    __metadata("design:paramtypes", [sidebar_service_1.SidebarService])
], SidebarController);
//# sourceMappingURL=sidebar.controller.js.map