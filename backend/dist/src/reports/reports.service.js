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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const mail_service_1 = require("../mail/mail.service");
let ReportsService = class ReportsService {
    constructor(prisma, mailService) {
        this.prisma = prisma;
        this.mailService = mailService;
    }
    async createReport(reporterId, reportedUserId, reason, conversationId, messageId, note) {
        if (reporterId === reportedUserId) {
            throw new common_1.BadRequestException('Cannot report yourself');
        }
        const reportedUser = await this.prisma.user.findUnique({
            where: { id: reportedUserId },
        });
        if (!reportedUser) {
            throw new common_1.NotFoundException('User not found');
        }
        if (conversationId) {
            const conversation = await this.prisma.conversation.findUnique({
                where: { id: conversationId },
                include: { participants: true },
            });
            if (!conversation) {
                throw new common_1.NotFoundException('Conversation not found');
            }
            const hasAccess = conversation.participants.some((p) => p.userId === reporterId);
            if (!hasAccess) {
                throw new common_1.BadRequestException('Access denied to conversation');
            }
        }
        const report = await this.prisma.userReport.create({
            data: {
                reporterId,
                reportedUserId,
                reason,
                conversationId,
                messageId,
                note,
                status: 'OPEN',
            },
            include: {
                reporter: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true,
                        fullName: true,
                    },
                },
                reportedUser: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true,
                        fullName: true,
                    },
                },
            },
        });
        const admins = await this.prisma.user.findMany({
            where: {
                OR: [{ isAdmin: true }, { superAdmin: true }],
            },
            select: { id: true },
        });
        await Promise.all(admins.map((admin) => this.prisma.notification.create({
            data: {
                userId: admin.id,
                type: 'REPORT_CREATED',
                message: `Yeni şikayet: ${report.reportedUser.username}`,
                fromUserId: reporterId,
            },
        })));
        return report;
    }
    async getReports(status, page = 1, limit = 20) {
        const where = {};
        if (status) {
            where.status = status;
        }
        const [reports, total] = await Promise.all([
            this.prisma.userReport.findMany({
                where,
                include: {
                    reporter: {
                        select: {
                            id: true,
                            username: true,
                            avatar: true,
                            fullName: true,
                        },
                    },
                    reportedUser: {
                        select: {
                            id: true,
                            username: true,
                            avatar: true,
                            fullName: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            this.prisma.userReport.count({ where }),
        ]);
        return {
            reports,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async updateReportStatus(reportId, status) {
        const validStatuses = ['OPEN', 'REVIEWING', 'RESOLVED', 'REJECTED'];
        if (!validStatuses.includes(status)) {
            throw new common_1.BadRequestException('Invalid status');
        }
        const report = await this.prisma.userReport.findUnique({
            where: { id: reportId },
            include: {
                reporter: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        fullName: true,
                        avatar: true,
                    },
                },
                reportedUser: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true,
                        fullName: true,
                    },
                },
            },
        });
        if (!report) {
            throw new common_1.NotFoundException('Report not found');
        }
        const updatedReport = await this.prisma.userReport.update({
            where: { id: reportId },
            data: { status },
            include: {
                reporter: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        avatar: true,
                        fullName: true,
                    },
                },
                reportedUser: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true,
                        fullName: true,
                    },
                },
            },
        });
        if (status === 'RESOLVED' && report.status !== 'RESOLVED') {
            this.sendReportResolvedEmail(updatedReport).catch((error) => {
                console.error('Failed to send report resolved email:', error);
            });
        }
        return updatedReport;
    }
    async sendReportResolvedEmail(report) {
        if (!report.reporter?.email) {
            return;
        }
        try {
            await this.mailService.sendReportResolvedEmail({
                to: report.reporter.email,
                userName: report.reporter.fullName || report.reporter.username,
                reportedUser: report.reportedUser.username,
            });
        }
        catch (error) {
            console.error('Error sending report resolved email:', error);
        }
    }
    async getReportById(reportId) {
        const report = await this.prisma.userReport.findUnique({
            where: { id: reportId },
            include: {
                reporter: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true,
                        fullName: true,
                    },
                },
                reportedUser: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true,
                        fullName: true,
                    },
                },
            },
        });
        if (!report) {
            throw new common_1.NotFoundException('Report not found');
        }
        return report;
    }
    async createContentReport(reporterId, contentType, contentId, reason, note) {
        if (contentType === 'post') {
            const post = await this.prisma.post.findUnique({
                where: { id: contentId },
            });
            if (!post) {
                throw new common_1.NotFoundException('Post not found');
            }
        }
        else if (contentType === 'comment') {
            const comment = await this.prisma.comment.findUnique({
                where: { id: contentId },
            });
            if (!comment) {
                throw new common_1.NotFoundException('Comment not found');
            }
        }
        const report = await this.prisma.report.create({
            data: {
                reporterId,
                contentType,
                contentId,
                reason,
                note,
                status: 'OPEN',
            },
            include: {
                reporter: {
                    select: {
                        id: true,
                        username: true,
                        avatar: true,
                        fullName: true,
                    },
                },
            },
        });
        const admins = await this.prisma.user.findMany({
            where: {
                OR: [{ isAdmin: true }, { superAdmin: true }],
            },
            select: { id: true },
        });
        await Promise.all(admins.map((admin) => this.prisma.notification.create({
            data: {
                userId: admin.id,
                type: 'REPORT_CREATED',
                message: `Yeni içerik raporu: ${contentType === 'post' ? 'Gönderi' : 'Yorum'}`,
                fromUserId: reporterId,
            },
        })));
        return report;
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        mail_service_1.MailService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map