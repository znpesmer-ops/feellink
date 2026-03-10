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
exports.AnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const analytics_service_1 = require("./analytics.service");
const roles_utils_1 = require("../roles/roles.utils");
let AnalyticsController = class AnalyticsController {
    constructor(analyticsService) {
        this.analyticsService = analyticsService;
    }
    async getVisits(user, range) {
        const capabilities = (0, roles_utils_1.computeCapabilities)(user.roles ?? [], user.plan ?? 'FREE', user.badges ?? []);
        if (!capabilities.permissions.canAccessAnalytics) {
            throw new common_1.ForbiddenException('Analizlere erişim için uygun role sahip değilsiniz.');
        }
        return this.analyticsService.getVisitStats(user.id, range || '30d');
    }
    async getWords(user) {
        const capabilities = (0, roles_utils_1.computeCapabilities)(user.roles ?? [], user.plan ?? 'FREE', user.badges ?? []);
        if (!capabilities.permissions.canAccessAnalytics) {
            throw new common_1.ForbiddenException('Analizlere erişim için uygun role sahip değilsiniz.');
        }
        return this.analyticsService.getTopWords(user.id);
    }
    async getTopUsers(user) {
        const capabilities = (0, roles_utils_1.computeCapabilities)(user.roles ?? [], user.plan ?? 'FREE', user.badges ?? []);
        if (!capabilities.permissions.canAccessAnalytics) {
            throw new common_1.ForbiddenException('Analizlere erişim için uygun role sahip değilsiniz.');
        }
        return this.analyticsService.getTopVisitors(user.id);
    }
    async getEventStats(user) {
        const capabilities = (0, roles_utils_1.computeCapabilities)(user.roles ?? [], user.plan ?? 'FREE', user.badges ?? []);
        if (!capabilities.permissions.canAccessAnalytics) {
            throw new common_1.ForbiddenException('Analizlere erişim için uygun role sahip değilsiniz.');
        }
        return this.analyticsService.getEventStats(user.id);
    }
    async getColorPalette(user) {
        const capabilities = (0, roles_utils_1.computeCapabilities)(user.roles ?? [], user.plan ?? 'FREE', user.badges ?? []);
        if (!capabilities.permissions.canAccessAnalytics) {
            throw new common_1.ForbiddenException('Analizlere erişim için uygun role sahip değilsiniz.');
        }
        return this.analyticsService.getColorPalette(user.id);
    }
    async getTopColorMatches(user) {
        const capabilities = (0, roles_utils_1.computeCapabilities)(user.roles ?? [], user.plan ?? 'FREE', user.badges ?? []);
        if (!capabilities.permissions.canAccessAnalytics) {
            throw new common_1.ForbiddenException('Analizlere erişim için uygun role sahip değilsiniz.');
        }
        return this.analyticsService.getTopColorMatches(user.id);
    }
    async getTopPerforming(user, range) {
        const capabilities = (0, roles_utils_1.computeCapabilities)(user.roles ?? [], user.plan ?? 'FREE', user.badges ?? []);
        if (!capabilities.permissions.canAccessAnalytics) {
            throw new common_1.ForbiddenException('Analizlere erişim için uygun role sahip değilsiniz.');
        }
        return this.analyticsService.getTopPerformingContent(user.id, range || '30d');
    }
    async getSaveAnalytics(user, range) {
        const capabilities = (0, roles_utils_1.computeCapabilities)(user.roles ?? [], user.plan ?? 'FREE', user.badges ?? []);
        if (!capabilities.permissions.canAccessAnalytics) {
            throw new common_1.ForbiddenException('Analizlere erişim için uygun role sahip değilsiniz.');
        }
        return this.analyticsService.getSaveAnalytics(user.id, range || '30d');
    }
    async getSourceDistribution(user, range) {
        const capabilities = (0, roles_utils_1.computeCapabilities)(user.roles ?? [], user.plan ?? 'FREE', user.badges ?? []);
        if (!capabilities.permissions.canAccessAnalytics) {
            throw new common_1.ForbiddenException('Analizlere erişim için uygun role sahip değilsiniz.');
        }
        return this.analyticsService.getSourceDistribution(user.id, range || '30d');
    }
    async getComparison(user, range) {
        const capabilities = (0, roles_utils_1.computeCapabilities)(user.roles ?? [], user.plan ?? 'FREE', user.badges ?? []);
        if (!capabilities.permissions.canAccessAnalytics) {
            throw new common_1.ForbiddenException('Analizlere erişim için uygun role sahip değilsiniz.');
        }
        return this.analyticsService.getPeriodComparison(user.id, range || '30d');
    }
    async getLowEngagement(user) {
        const capabilities = (0, roles_utils_1.computeCapabilities)(user.roles ?? [], user.plan ?? 'FREE', user.badges ?? []);
        if (!capabilities.permissions.canAccessAnalytics) {
            throw new common_1.ForbiddenException('Analizlere erişim için uygun role sahip değilsiniz.');
        }
        return this.analyticsService.getLowEngagementWarning(user.id);
    }
};
exports.AnalyticsController = AnalyticsController;
__decorate([
    (0, common_1.Get)('visits'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('range')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getVisits", null);
__decorate([
    (0, common_1.Get)('words'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getWords", null);
__decorate([
    (0, common_1.Get)('top-users'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getTopUsers", null);
__decorate([
    (0, common_1.Get)('event-stats'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getEventStats", null);
__decorate([
    (0, common_1.Get)('color-palette'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getColorPalette", null);
__decorate([
    (0, common_1.Get)('color-match/top5'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getTopColorMatches", null);
__decorate([
    (0, common_1.Get)('top-performing'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('range')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getTopPerforming", null);
__decorate([
    (0, common_1.Get)('saves'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('range')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getSaveAnalytics", null);
__decorate([
    (0, common_1.Get)('sources'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('range')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getSourceDistribution", null);
__decorate([
    (0, common_1.Get)('comparison'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('range')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getComparison", null);
__decorate([
    (0, common_1.Get)('low-engagement'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getLowEngagement", null);
exports.AnalyticsController = AnalyticsController = __decorate([
    (0, common_1.Controller)('analytics'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [analytics_service_1.AnalyticsService])
], AnalyticsController);
//# sourceMappingURL=analytics.controller.js.map