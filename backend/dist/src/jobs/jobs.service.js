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
var JobsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const limits_service_1 = require("../limits/limits.service");
const mail_service_1 = require("../mail/mail.service");
const chat_service_1 = require("../chat/chat.service");
let JobsService = JobsService_1 = class JobsService {
    constructor(prisma, limitsService, mailService, chatService) {
        this.prisma = prisma;
        this.limitsService = limitsService;
        this.mailService = mailService;
        this.chatService = chatService;
        this.logger = new common_1.Logger(JobsService_1.name);
    }
    async create(userId, dto) {
        await this.limitsService.ensureLimit(userId, 'create_job');
        if (!dto.saveAsDraft) {
            if (!dto.deadline && !dto.maxApplications && !dto.autoCloseOnDeadline) {
                throw new common_1.BadRequestException('Yayınlanan ilanlar için yayınlanma ayarları zorunludur. Lütfen Son Başvuru Tarihi, Maks. Başvuru Sayısı veya Otomatik Kapatma seçeneklerinden en az birini doldurun.');
            }
        }
        const tags = Array.isArray(dto.tags)
            ? dto.tags.filter((tag) => typeof tag === 'string' && tag.trim().length > 0)
            : [];
        return this.prisma.jobListing.create({
            data: {
                title: dto.title,
                description: dto.description,
                company: dto.company,
                location: dto.location,
                salary: dto.salary,
                tags,
                createdById: userId,
            },
        });
    }
    async update(jobId, userId, dto) {
        const job = await this.prisma.jobListing.findUnique({
            where: { id: jobId },
        });
        if (!job) {
            throw new common_1.NotFoundException('İlan bulunamadı');
        }
        if (job.createdById !== userId) {
            throw new common_1.ForbiddenException('Bu ilanı düzenleme yetkiniz yok');
        }
        if (!dto.deadline && !dto.maxApplications && !dto.autoCloseOnDeadline) {
            throw new common_1.BadRequestException('Yayınlanan ilanlar için yayınlanma ayarları zorunludur. Lütfen Son Başvuru Tarihi, Maks. Başvuru Sayısı veya Otomatik Kapatma seçeneklerinden en az birini doldurun.');
        }
        const tags = Array.isArray(dto.tags)
            ? dto.tags.filter((tag) => typeof tag === 'string' && tag.trim().length > 0)
            : [];
        return this.prisma.jobListing.update({
            where: { id: jobId },
            data: {
                title: dto.title,
                description: dto.description,
                company: dto.company,
                location: dto.location,
                salary: dto.salary,
                tags,
                updatedAt: new Date(),
            },
        });
    }
    async getAll() {
        return this.prisma.jobListing.findMany({
            orderBy: {
                createdAt: 'desc',
            },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        username: true,
                        fullName: true,
                        avatar: true,
                    },
                },
            },
        });
    }
    async getMyJobs(userId) {
        return this.prisma.jobListing.findMany({
            where: {
                createdById: userId,
            },
            orderBy: {
                createdAt: 'desc',
            },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        username: true,
                        fullName: true,
                        avatar: true,
                    },
                },
                _count: {
                    select: {
                        applications: true,
                    },
                },
            },
        });
    }
    async getById(jobId, userId) {
        const job = await this.prisma.jobListing.findUnique({
            where: { id: jobId },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        username: true,
                        fullName: true,
                        avatar: true,
                    },
                },
            },
        });
        if (!job) {
            throw new common_1.NotFoundException('İlan bulunamadı');
        }
        if (job.createdById !== userId) {
            throw new common_1.ForbiddenException('Bu ilanı görüntüleme yetkiniz yok');
        }
        return job;
    }
    async applyToJob(jobListingId, userId, dto) {
        const jobListing = await this.prisma.jobListing.findUnique({
            where: { id: jobListingId },
            include: { createdBy: true },
        });
        if (!jobListing) {
            throw new common_1.NotFoundException('İlan bulunamadı');
        }
        if (jobListing.createdById === userId) {
            throw new common_1.BadRequestException('Kendi ilanına başvuru yapamazsın');
        }
        const existing = await this.prisma.jobApplication.findUnique({
            where: {
                jobListingId_applicantId: {
                    jobListingId,
                    applicantId: userId,
                },
            },
        });
        if (existing) {
            throw new common_1.BadRequestException('Bu ilana zaten başvurdun');
        }
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        const application = await this.prisma.jobApplication.create({
            data: {
                jobListingId,
                applicantId: userId,
                coverLetter: dto.coverLetter || null,
                portfolioUrl: dto.portfolioUrl || null,
                portfolioFileUrl: dto.portfolioFileUrl || null,
                cvUrl: dto.cvUrl || null,
                expiresAt,
            },
            include: {
                applicant: {
                    select: {
                        id: true,
                        username: true,
                        fullName: true,
                        avatar: true,
                        email: true,
                    },
                },
            },
        });
        await this.prisma.notification.create({
            data: {
                userId: jobListing.createdById,
                type: 'job_application_received',
                message: `${application.applicant.fullName || application.applicant.username || 'Bir kullanıcı'}, "${jobListing.title}" ilanına başvurdu.`,
                fromUserId: userId,
                targetPath: `/fellink/${jobListingId}?tab=applications`,
                targetUrl: `/fellink/${jobListingId}?tab=applications`,
            },
        });
        await this.prisma.notification.create({
            data: {
                userId: userId,
                type: 'job_application_received',
                message: `Başvurunuz alındı. "${jobListing.title}" ilanına yaptığınız başvuru başarıyla iletildi. İlan sahibi başvurunuzu incelediğinde durum güncellenecektir.`,
                fromUserId: jobListing.createdById,
                targetPath: `/fellink?tab=applications`,
                targetUrl: `/fellink?tab=applications`,
            },
        });
        return application;
    }
    async getApplicationsForJob(jobListingId, ownerId) {
        const jobListing = await this.prisma.jobListing.findUnique({
            where: { id: jobListingId },
        });
        if (!jobListing) {
            throw new common_1.NotFoundException('İlan bulunamadı');
        }
        if (jobListing.createdById !== ownerId) {
            throw new common_1.ForbiddenException('Erişim yok');
        }
        return this.prisma.jobApplication.findMany({
            where: { jobListingId },
            select: {
                id: true,
                coverLetter: true,
                portfolioUrl: true,
                portfolioFileUrl: true,
                cvUrl: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                expiresAt: true,
                applicant: {
                    select: {
                        id: true,
                        username: true,
                        fullName: true,
                        email: true,
                        avatar: true,
                        roles: true,
                    },
                },
                activities: {
                    orderBy: { createdAt: 'desc' },
                    take: 10,
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getMyApplications(userId) {
        return this.prisma.jobApplication.findMany({
            where: { applicantId: userId },
            select: {
                id: true,
                coverLetter: true,
                portfolioUrl: true,
                portfolioFileUrl: true,
                cvUrl: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                expiresAt: true,
                jobListing: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        company: true,
                        location: true,
                        salary: true,
                        tags: true,
                        createdAt: true,
                        createdBy: {
                            select: {
                                id: true,
                                username: true,
                                fullName: true,
                                avatar: true,
                            },
                        },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async updateApplicationStatus(applicationId, ownerId, status) {
        const application = await this.prisma.jobApplication.findUnique({
            where: { id: applicationId },
            include: { jobListing: true },
        });
        if (!application) {
            throw new common_1.NotFoundException('Başvuru bulunamadı');
        }
        if (application.jobListing.createdById !== ownerId) {
            throw new common_1.ForbiddenException('Erişim yok');
        }
        const updated = await this.prisma.jobApplication.update({
            where: { id: applicationId },
            data: { status: status },
            include: {
                applicant: {
                    select: {
                        id: true,
                        username: true,
                        fullName: true,
                        email: true,
                    },
                },
                jobListing: {
                    select: {
                        id: true,
                        title: true,
                        company: true,
                        createdBy: {
                            select: {
                                email: true,
                            },
                        },
                    },
                },
            },
        });
        await this.prisma.applicationActivity.create({
            data: {
                applicationId: applicationId,
                action: status,
                details: `Status changed to ${status}`,
            },
        });
        const jobTitle = application.jobListing.title;
        let statusMessage = '';
        switch (status) {
            case 'REVIEWED':
                statusMessage = `Başvurunuz ilan sahibi tarafından incelenmektedir. "${jobTitle}" ilanına yaptığınız başvuru değerlendirme aşamasındadır.`;
                break;
            case 'ACCEPTED':
                statusMessage = `Başvurunuz olumlu değerlendirilmiştir. "${jobTitle}" ilanı için sizinle iletişime geçilecektir.`;
                break;
            case 'REJECTED':
                statusMessage = `Başvurunuzu değerlendirdik. Bu pozisyon için sürece farklı adaylarla devam ediyoruz; ilginiz için teşekkür ederiz.`;
                break;
            case 'INTERVIEW':
                statusMessage = `Başvurunuz olumlu değerlendirilmiştir. "${jobTitle}" ilanı için görüşme için sizinle iletişime geçilecektir.`;
                break;
            default:
                statusMessage = `"${jobTitle}" ilanına yaptığınız başvurunun durumu güncellendi.`;
        }
        await this.prisma.notification.create({
            data: {
                userId: application.applicantId,
                type: 'job_application_status_changed',
                message: statusMessage,
                fromUserId: ownerId,
                targetPath: `/fellink?tab=applications`,
                targetUrl: `/fellink?tab=applications`,
            },
        });
        if (status === 'ACCEPTED' && updated.applicant.email) {
            try {
                await this.mailService.sendApplicationApprovedMail({
                    to: updated.applicant.email,
                    name: updated.applicant.fullName || updated.applicant.username,
                    listingTitle: updated.jobListing.title,
                    companyName: updated.jobListing.company || undefined,
                    contactEmail: updated.jobListing.createdBy.email || undefined,
                });
                await this.prisma.applicationActivity.create({
                    data: {
                        applicationId: applicationId,
                        action: 'MAIL_SENT',
                        details: 'Approval email sent to applicant',
                    },
                });
            }
            catch (error) {
                this.logger.error(`Failed to send approval email for application ${applicationId}:`, error);
            }
        }
        if (status === 'REJECTED' && updated.applicant.email) {
            try {
                await this.mailService.sendApplicationRejectedMail({
                    to: updated.applicant.email,
                    name: updated.applicant.fullName || updated.applicant.username,
                    listingTitle: updated.jobListing.title,
                });
                await this.prisma.applicationActivity.create({
                    data: {
                        applicationId: applicationId,
                        action: 'MAIL_SENT',
                        details: 'Rejection email sent to applicant',
                    },
                });
            }
            catch (error) {
                this.logger.error(`Failed to send rejection email for application ${applicationId}:`, error);
            }
        }
        return updated;
    }
    async checkUserApplication(jobListingId, userId) {
        const application = await this.prisma.jobApplication.findUnique({
            where: {
                jobListingId_applicantId: {
                    jobListingId,
                    applicantId: userId,
                },
            },
        });
        return application ? { hasApplied: true, application } : { hasApplied: false, application: null };
    }
    async updateAdminNote(applicationId, ownerId, note) {
        const application = await this.prisma.jobApplication.findUnique({
            where: { id: applicationId },
            include: { jobListing: true },
        });
        if (!application) {
            throw new common_1.NotFoundException('Başvuru bulunamadı');
        }
        if (application.jobListing.createdById !== ownerId) {
            throw new common_1.ForbiddenException('Erişim yok');
        }
        const updated = await this.prisma.jobApplication.update({
            where: { id: applicationId },
            data: { adminNote: note },
        });
        await this.prisma.applicationActivity.create({
            data: {
                applicationId: applicationId,
                action: 'NOTE_ADDED',
                details: note ? `Note updated: ${note.substring(0, 50)}...` : 'Note removed',
            },
        });
        return updated;
    }
    async updateTags(applicationId, ownerId, tags) {
        const application = await this.prisma.jobApplication.findUnique({
            where: { id: applicationId },
            include: { jobListing: true },
        });
        if (!application) {
            throw new common_1.NotFoundException('Başvuru bulunamadı');
        }
        if (application.jobListing.createdById !== ownerId) {
            throw new common_1.ForbiddenException('Erişim yok');
        }
        const cleanedTags = tags
            .filter((tag) => typeof tag === 'string' && tag.trim().length > 0)
            .map((tag) => tag.trim().toLowerCase())
            .filter((tag, index, self) => self.indexOf(tag) === index);
        const updated = await this.prisma.jobApplication.update({
            where: { id: applicationId },
            data: { tags: cleanedTags },
        });
        await this.prisma.applicationActivity.create({
            data: {
                applicationId: applicationId,
                action: cleanedTags.length > (application.tags?.length || 0) ? 'TAG_ADDED' : 'TAG_REMOVED',
                details: `Tags updated: ${cleanedTags.join(', ')}`,
            },
        });
        return updated;
    }
    async getApplicationActivities(applicationId, ownerId) {
        const application = await this.prisma.jobApplication.findUnique({
            where: { id: applicationId },
            include: { jobListing: true },
        });
        if (!application) {
            throw new common_1.NotFoundException('Başvuru bulunamadı');
        }
        if (application.jobListing.createdById !== ownerId) {
            throw new common_1.ForbiddenException('Erişim yok');
        }
        return this.prisma.applicationActivity.findMany({
            where: { applicationId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async deleteJob(jobId, userId, isAdminUser) {
        const jobListing = await this.prisma.jobListing.findUnique({
            where: { id: jobId },
        });
        if (!jobListing) {
            throw new common_1.NotFoundException('İlan bulunamadı');
        }
        if (jobListing.createdById !== userId && !isAdminUser) {
            throw new common_1.ForbiddenException('Bu ilanı silme yetkiniz yok');
        }
        await this.prisma.jobListing.delete({
            where: { id: jobId },
        });
        return { success: true, message: 'İlan başarıyla silindi' };
    }
    async getOwnerListingsAnalytics(ownerId) {
        const listings = await this.prisma.jobListing.findMany({
            where: { createdById: ownerId },
            include: {
                applications: {
                    select: {
                        id: true,
                        status: true,
                        createdAt: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        const summary = listings.map((listing) => {
            const total = listing.applications.length;
            const pending = listing.applications.filter((a) => a.status === 'PENDING').length;
            const accepted = listing.applications.filter((a) => a.status === 'ACCEPTED').length;
            const rejected = listing.applications.filter((a) => a.status === 'REJECTED').length;
            const reviewed = listing.applications.filter((a) => a.status === 'REVIEWED').length;
            return {
                listingId: listing.id,
                title: listing.title,
                company: listing.company,
                location: listing.location,
                totalApplications: total,
                pending,
                accepted,
                rejected,
                reviewed,
                createdAt: listing.createdAt,
            };
        });
        const totalApplications = summary.reduce((acc, s) => acc + s.totalApplications, 0);
        const totalPending = summary.reduce((acc, s) => acc + s.pending, 0);
        const totalAccepted = summary.reduce((acc, s) => acc + s.accepted, 0);
        const totalRejected = summary.reduce((acc, s) => acc + s.rejected, 0);
        return {
            totalApplications,
            totalPending,
            totalAccepted,
            totalRejected,
            totalListings: listings.length,
            listings: summary,
        };
    }
};
exports.JobsService = JobsService;
exports.JobsService = JobsService = JobsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(3, (0, common_1.Inject)((0, common_1.forwardRef)(() => chat_service_1.ChatService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        limits_service_1.LimitsService,
        mail_service_1.MailService,
        chat_service_1.ChatService])
], JobsService);
//# sourceMappingURL=jobs.service.js.map