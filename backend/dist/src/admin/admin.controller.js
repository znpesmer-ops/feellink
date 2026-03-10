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
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const admin_service_1 = require("./admin.service");
const reports_service_1 = require("../reports/reports.service");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const admin_guard_1 = require("../auth/guards/admin.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
let AdminController = class AdminController {
    constructor(prisma, adminService, reportsService) {
        this.prisma = prisma;
        this.adminService = adminService;
        this.reportsService = reportsService;
    }
    async getSummary() {
        return this.adminService.getSummary();
    }
    async getUsers(page, limit, search, role, city, gender, ageMin, ageMax) {
        return this.adminService.getUsers(page ? parseInt(page) : 1, limit ? parseInt(limit) : 20, search, role, city, gender, ageMin ? parseInt(ageMin) : undefined, ageMax ? parseInt(ageMax) : undefined);
    }
    async updateUser(userId, data, user) {
        return this.adminService.updateUser(userId, data, user.id);
    }
    async suspendUser(userId, data, admin) {
        const until = data.until ? new Date(data.until) : null;
        return this.adminService.suspendUser(userId, admin.id, {
            until,
            reason: data.reason,
            note: data.note,
        });
    }
    async unsuspendUser(userId) {
        return this.adminService.unsuspendUser(userId);
    }
    async updateUserRoles(userId, data, user) {
        return this.adminService.updateUser(userId, { roles: data.roles }, user.id);
    }
    async getRoleHistory(userId) {
        return this.adminService.getRoleHistory(userId);
    }
    async getRoleChangeRemainingDays(userId) {
        const remainingDays = await this.adminService.getRoleChangeRemainingDays(userId);
        return { remainingDays };
    }
    async getRoleChangeRequests(status, page, limit) {
        return this.adminService.getRoleChangeRequests(status, page ? parseInt(page) : 1, limit ? parseInt(limit) : 20);
    }
    async approveRoleChangeRequest(requestId, adminUser, data) {
        return this.adminService.approveRoleChangeRequest(requestId, adminUser.id, data?.reviewNote);
    }
    async rejectRoleChangeRequest(requestId, adminUser, data) {
        return this.adminService.rejectRoleChangeRequest(requestId, adminUser.id, data?.reviewNote);
    }
    async deleteUser(userId, user) {
        if (!user || !user.id) {
            throw new Error('Kullanıcı doğrulaması başarısız');
        }
        return this.adminService.deleteUser(userId, user.id);
    }
    async getPosts(page, limit) {
        return this.adminService.getPosts(page ? parseInt(page) : 1, limit ? parseInt(limit) : 20);
    }
    async deletePost(postId, user) {
        if (!user || !user.id) {
            throw new Error('Kullanıcı doğrulaması başarısız');
        }
        return this.adminService.deletePost(postId, user.id);
    }
    async getArtworks(page, limit, search, userId) {
        return this.adminService.getArtworks(page ? parseInt(page) : 1, limit ? parseInt(limit) : 20, search, userId);
    }
    async deleteArtwork(artworkId, user) {
        return this.adminService.deleteArtwork(artworkId, user.id);
    }
    async getComments(page, limit) {
        return this.adminService.getComments(page ? parseInt(page) : 1, limit ? parseInt(limit) : 20);
    }
    async deleteComment(commentId, user) {
        return this.adminService.deleteComment(commentId, user.id);
    }
    async getArticles(page, limit) {
        return this.adminService.getArticles(page ? parseInt(page) : 1, limit ? parseInt(limit) : 20);
    }
    async deleteArticle(articleId, user) {
        return this.adminService.deleteArticle(articleId, user.id);
    }
    async getEvents(page, limit) {
        return this.adminService.getEvents(page ? parseInt(page) : 1, limit ? parseInt(limit) : 20);
    }
    async getTickets(page, limit) {
        return this.adminService.getTickets(page ? parseInt(page) : 1, limit ? parseInt(limit) : 20);
    }
    async getFeatureFlags() {
        return this.adminService.getFeatureFlags();
    }
    async updateFeatureFlag(body, user) {
        return this.adminService.updateFeatureFlag(body.key, body.enabled, user.id);
    }
    async getAuditLogs(page, limit) {
        return this.adminService.getAuditLogs(page ? parseInt(page) : 1, limit ? parseInt(limit) : 50);
    }
    async getModeration() {
        return this.adminService.getModerationItems();
    }
    async getAnalytics() {
        return this.adminService.getAnalytics();
    }
    async recalculateFollows() {
        const users = await this.prisma.user.findMany({
            select: { id: true },
        });
        let fixed = 0;
        const updates = [];
        for (const user of users) {
            const [followers, following] = await Promise.all([
                this.prisma.follow.count({
                    where: { followingId: user.id },
                }),
                this.prisma.follow.count({
                    where: { followerId: user.id },
                }),
            ]);
            updates.push(this.prisma.user.update({
                where: { id: user.id },
                data: {
                    followerCount: followers,
                    followingCount: following,
                },
            }));
            fixed++;
        }
        await Promise.all(updates);
        return {
            message: '✅ Tüm kullanıcıların takipçi/following sayıları kontrol edildi ve güncellendi.',
            totalUsers: users.length,
            updated: fixed,
            timestamp: new Date().toISOString(),
        };
    }
    async recalculateColors() {
        return this.adminService.recalculateColors();
    }
    async getReports(status, page, limit) {
        return this.reportsService.getReports(status, page ? parseInt(page) : 1, limit ? parseInt(limit) : 20);
    }
    async getReportById(reportId) {
        return this.reportsService.getReportById(reportId);
    }
    async updateReportStatus(reportId, body) {
        return this.reportsService.updateReportStatus(reportId, body.status);
    }
    async updateSiteName(body, user) {
        const result = await this.adminService.updateSetting('siteName', body.value, user.id);
        return {
            success: true,
            data: result,
        };
    }
    async updateSiteDescription(body, user) {
        const result = await this.adminService.updateSetting('siteDescription', body.value, user.id);
        return {
            success: true,
            data: result,
        };
    }
    async updateAdminEmail(body, user) {
        const result = await this.adminService.updateSetting('adminEmail', body.value, user.id);
        return {
            success: true,
            data: result,
        };
    }
    async getSettings() {
        const settings = await this.adminService.getSettings();
        return {
            success: true,
            data: settings,
        };
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('summary'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Get)('users'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('search')),
    __param(3, (0, common_1.Query)('role')),
    __param(4, (0, common_1.Query)('city')),
    __param(5, (0, common_1.Query)('gender')),
    __param(6, (0, common_1.Query)('ageMin')),
    __param(7, (0, common_1.Query)('ageMax')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getUsers", null);
__decorate([
    (0, common_1.Patch)('users/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateUser", null);
__decorate([
    (0, common_1.Patch)('users/:id/suspend'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "suspendUser", null);
__decorate([
    (0, common_1.Patch)('users/:id/unsuspend'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "unsuspendUser", null);
__decorate([
    (0, common_1.Patch)('users/:id/roles'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateUserRoles", null);
__decorate([
    (0, common_1.Get)('users/:id/role-history'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getRoleHistory", null);
__decorate([
    (0, common_1.Get)('users/:id/role-change-remaining-days'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getRoleChangeRemainingDays", null);
__decorate([
    (0, common_1.Get)('role-change-requests'),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getRoleChangeRequests", null);
__decorate([
    (0, common_1.Patch)('role-change-requests/:id/approve'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "approveRoleChangeRequest", null);
__decorate([
    (0, common_1.Patch)('role-change-requests/:id/reject'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "rejectRoleChangeRequest", null);
__decorate([
    (0, common_1.Delete)('users/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "deleteUser", null);
__decorate([
    (0, common_1.Get)('posts'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getPosts", null);
__decorate([
    (0, common_1.Delete)('posts/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "deletePost", null);
__decorate([
    (0, common_1.Get)('artworks'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('search')),
    __param(3, (0, common_1.Query)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getArtworks", null);
__decorate([
    (0, common_1.Delete)('artworks/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "deleteArtwork", null);
__decorate([
    (0, common_1.Get)('comments'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getComments", null);
__decorate([
    (0, common_1.Delete)('comments/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "deleteComment", null);
__decorate([
    (0, common_1.Get)('articles'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getArticles", null);
__decorate([
    (0, common_1.Delete)('articles/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "deleteArticle", null);
__decorate([
    (0, common_1.Get)('events'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getEvents", null);
__decorate([
    (0, common_1.Get)('tickets'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getTickets", null);
__decorate([
    (0, common_1.Get)('feature-flags'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getFeatureFlags", null);
__decorate([
    (0, common_1.Post)('feature-flags'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateFeatureFlag", null);
__decorate([
    (0, common_1.Get)('audit-logs'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getAuditLogs", null);
__decorate([
    (0, common_1.Get)('moderation'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getModeration", null);
__decorate([
    (0, common_1.Get)('analytics'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getAnalytics", null);
__decorate([
    (0, common_1.Post)('recalculate-follows'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "recalculateFollows", null);
__decorate([
    (0, common_1.Post)('recalculate-colors'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "recalculateColors", null);
__decorate([
    (0, common_1.Get)('reports'),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getReports", null);
__decorate([
    (0, common_1.Get)('reports/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getReportById", null);
__decorate([
    (0, common_1.Patch)('reports/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateReportStatus", null);
__decorate([
    (0, common_1.Patch)('settings/site-name'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateSiteName", null);
__decorate([
    (0, common_1.Patch)('settings/site-description'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateSiteDescription", null);
__decorate([
    (0, common_1.Patch)('settings/admin-email'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateAdminEmail", null);
__decorate([
    (0, common_1.Get)('settings'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getSettings", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)('admin'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, admin_guard_1.AdminGuard),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        admin_service_1.AdminService,
        reports_service_1.ReportsService])
], AdminController);
//# sourceMappingURL=admin.controller.js.map