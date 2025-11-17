import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { LimitsService } from '../limits/limits.service';
import { CreateJobApplicationDto } from './dto/create-application.dto';
import { ApplicationStatus } from './dto/update-application-status.dto';

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly limitsService: LimitsService,
  ) {}

  async create(userId: string, dto: CreateJobDto) {
    await this.limitsService.ensureLimit(userId, 'create_job');
    const tags =
      Array.isArray(dto.tags)
        ? dto.tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
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

  async applyToJob(jobListingId: string, userId: string, dto: CreateJobApplicationDto) {
    const jobListing = await this.prisma.jobListing.findUnique({
      where: { id: jobListingId },
      include: { createdBy: true },
    });

    if (!jobListing) {
      throw new NotFoundException('İlan bulunamadı');
    }

    // Kendinin ilanına başvuru yapmasın
    if (jobListing.createdById === userId) {
      throw new BadRequestException('Kendi ilanına başvuru yapamazsın');
    }

    // Zaten başvurmuş mu?
    const existing = await this.prisma.jobApplication.findUnique({
      where: {
        jobListingId_applicantId: {
          jobListingId,
          applicantId: userId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Bu ilana zaten başvurdun');
    }

    const application = await this.prisma.jobApplication.create({
      data: {
        jobListingId,
        applicantId: userId,
        coverLetter: dto.coverLetter,
        portfolioUrl: dto.portfolioUrl,
        cvUrl: dto.cvUrl,
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

    // İlan sahibine bildirim gönder
    await this.prisma.notification.create({
      data: {
        userId: jobListing.createdById,
        type: 'job_application_received',
        message: `${application.applicant.fullName || application.applicant.username || 'Bir kullanıcı'}, "${jobListing.title}" ilanına başvurdu.`,
        fromUserId: userId,
        targetPath: `/fellink/${jobListingId}?tab=applications`, // 🔥 KRİTİK: İlan detay sayfasına başvurular sekmesi ile
        targetUrl: `/fellink/${jobListingId}?tab=applications`, // Geriye uyumluluk için
        // Metadata'ya listingId ekle (fallback için)
        // Not: Prisma Notification modelinde metadata alanı yok, bu yüzden targetPath kullanılacak
      },
    });

    return application;
  }

  async getApplicationsForJob(jobListingId: string, ownerId: string) {
    // Güvenlik: sadece ilan sahibi görebilsin
    const jobListing = await this.prisma.jobListing.findUnique({
      where: { id: jobListingId },
    });

    if (!jobListing) {
      throw new NotFoundException('İlan bulunamadı');
    }
    if (jobListing.createdById !== ownerId) {
      throw new ForbiddenException('Erişim yok');
    }

    return this.prisma.jobApplication.findMany({
      where: { jobListingId },
      include: {
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
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMyApplications(userId: string) {
    return this.prisma.jobApplication.findMany({
      where: { applicantId: userId },
      include: {
        jobListing: {
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
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateApplicationStatus(applicationId: string, ownerId: string, status: ApplicationStatus) {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id: applicationId },
      include: { jobListing: true },
    });

    if (!application) {
      throw new NotFoundException('Başvuru bulunamadı');
    }
    if (application.jobListing.createdById !== ownerId) {
      throw new ForbiddenException('Erişim yok');
    }

    const updated = await this.prisma.jobApplication.update({
      where: { id: applicationId },
      data: { status },
      include: {
        applicant: {
          select: {
            id: true,
            username: true,
            fullName: true,
          },
        },
        jobListing: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Başvuran kullanıcıya bildirim gönder
    await this.prisma.notification.create({
      data: {
        userId: application.applicantId,
        type: 'job_application_status_changed',
        message: `"${updated.jobListing.title}" ilanına yaptığın başvurunun durumu "${status}" olarak güncellendi.`,
        fromUserId: ownerId,
        targetPath: `/fellink/my-applications`,
        targetUrl: `/fellink/my-applications`, // Geriye uyumluluk için
      },
    });

    return updated;
  }

  async checkUserApplication(jobListingId: string, userId: string) {
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

  // 🔥 İlan sahibinin tüm ilanları için analiz
  async getOwnerListingsAnalytics(ownerId: string) {
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

    // İlan bazlı özet
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

    // Global toplamlar
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
}



