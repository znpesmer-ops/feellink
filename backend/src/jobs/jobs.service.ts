import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Logger } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { LimitsService } from '../limits/limits.service';
import { CreateJobApplicationDto } from './dto/create-application.dto';
import { ApplicationStatus } from './dto/update-application-status.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly limitsService: LimitsService,
    private readonly mailService: MailService,
  ) {}

  async create(userId: string, dto: CreateJobDto) {
    await this.limitsService.ensureLimit(userId, 'create_job');
    
    // ✅ Yayınlama ayarları validasyonu (sadece yayınlama için, taslak için değil)
    if (!dto.saveAsDraft) {
      if (!dto.deadline && !dto.maxApplications && !dto.autoCloseOnDeadline) {
        throw new BadRequestException(
          'Yayınlanan ilanlar için yayınlanma ayarları zorunludur. Lütfen Son Başvuru Tarihi, Maks. Başvuru Sayısı veya Otomatik Kapatma seçeneklerinden en az birini doldurun.',
        );
      }
    }
    
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

  async update(jobId: string, userId: string, dto: CreateJobDto) {
    // İlan sahibi kontrolü
    const job = await this.prisma.jobListing.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException('İlan bulunamadı');
    }

    if (job.createdById !== userId) {
      throw new ForbiddenException('Bu ilanı düzenleme yetkiniz yok');
    }

    // ✅ Edit modunda da yayınlama ayarları zorunlu (ilan zaten yayında)
    if (!dto.deadline && !dto.maxApplications && !dto.autoCloseOnDeadline) {
      throw new BadRequestException(
        'Yayınlanan ilanlar için yayınlanma ayarları zorunludur. Lütfen Son Başvuru Tarihi, Maks. Başvuru Sayısı veya Otomatik Kapatma seçeneklerinden en az birini doldurun.',
      );
    }

    const tags =
      Array.isArray(dto.tags)
        ? dto.tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim().length > 0)
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

  async getMyJobs(userId: string) {
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

  async getById(jobId: string, userId: string) {
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
      throw new NotFoundException('İlan bulunamadı');
    }

    // Sadece ilan sahibi düzenleyebilir
    if (job.createdById !== userId) {
      throw new ForbiddenException('Bu ilanı görüntüleme yetkiniz yok');
    }

    return job;
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

    // Portfolyo ve CV artık opsiyonel - hiçbiri zorunlu değil

    // 30 gün sonrası için expiresAt hesapla
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30)

    const application = await this.prisma.jobApplication.create({
      data: {
        jobListingId,
        applicantId: userId,
        coverLetter: dto.coverLetter || null,
        portfolioUrl: dto.portfolioUrl || null,
        portfolioFileUrl: dto.portfolioFileUrl || null,
        cvUrl: dto.cvUrl || null,
        expiresAt, // 30 günlük yanıt süresi
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
        targetPath: `/fellink/${jobListingId}?tab=applications`,
        targetUrl: `/fellink/${jobListingId}?tab=applications`,
      },
    });

    // Başvuran kullanıcıya otomatik onay bildirimi gönder
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
          take: 10, // Son 10 aktivite
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMyApplications(userId: string) {
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
      data: { status: status as any },
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

    // Activity log ekle
    await this.prisma.applicationActivity.create({
      data: {
        applicationId: applicationId,
        action: status,
        details: `Status changed to ${status}`,
      },
    });

    // Başvuran kullanıcıya bildirim gönder - duruma göre profesyonel mesaj
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

    // APPROVED durumunda otomatik mail gönder
    if (status === 'ACCEPTED' && updated.applicant.email) {
      try {
        await this.mailService.sendApplicationApprovedMail({
          to: updated.applicant.email,
          name: updated.applicant.fullName || updated.applicant.username,
          listingTitle: updated.jobListing.title,
          companyName: updated.jobListing.company || undefined,
          contactEmail: updated.jobListing.createdBy.email || undefined,
        });

        // Mail gönderildi activity log'u
        await this.prisma.applicationActivity.create({
          data: {
            applicationId: applicationId,
            action: 'MAIL_SENT',
            details: 'Approval email sent to applicant',
          },
        });
      } catch (error) {
        this.logger.error(`Failed to send approval email for application ${applicationId}:`, error);
        // Mail hatası durumunda işlemi durdurmuyoruz, sadece logluyoruz
      }
    }

    // REJECTED durumunda otomatik mail gönder
    if (status === 'REJECTED' && updated.applicant.email) {
      try {
        await this.mailService.sendApplicationRejectedMail({
          to: updated.applicant.email,
          name: updated.applicant.fullName || updated.applicant.username,
          listingTitle: updated.jobListing.title,
        });

        // Mail gönderildi activity log'u
        await this.prisma.applicationActivity.create({
          data: {
            applicationId: applicationId,
            action: 'MAIL_SENT',
            details: 'Rejection email sent to applicant',
          },
        });
      } catch (error) {
        this.logger.error(`Failed to send rejection email for application ${applicationId}:`, error);
        // Mail hatası durumunda işlemi durdurmuyoruz, sadece logluyoruz
      }
    }

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

  async updateAdminNote(applicationId: string, ownerId: string, note: string | null) {
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
      data: { adminNote: note },
    });

    // Activity log ekle
    await this.prisma.applicationActivity.create({
      data: {
        applicationId: applicationId,
        action: 'NOTE_ADDED',
        details: note ? `Note updated: ${note.substring(0, 50)}...` : 'Note removed',
      },
    });

    return updated;
  }

  async updateTags(applicationId: string, ownerId: string, tags: string[]) {
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

    // Temizle ve doğrula
    const cleanedTags = tags
      .filter((tag) => typeof tag === 'string' && tag.trim().length > 0)
      .map((tag) => tag.trim().toLowerCase())
      .filter((tag, index, self) => self.indexOf(tag) === index); // Unique

    const updated = await this.prisma.jobApplication.update({
      where: { id: applicationId },
      data: { tags: cleanedTags },
    });

    // Activity log ekle
    await this.prisma.applicationActivity.create({
      data: {
        applicationId: applicationId,
        action: cleanedTags.length > (application.tags?.length || 0) ? 'TAG_ADDED' : 'TAG_REMOVED',
        details: `Tags updated: ${cleanedTags.join(', ')}`,
      },
    });

    return updated;
  }

  async getApplicationActivities(applicationId: string, ownerId: string) {
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

    return this.prisma.applicationActivity.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 🔥 İlan silme
  async deleteJob(jobId: string, userId: string, isAdminUser: boolean) {
    const jobListing = await this.prisma.jobListing.findUnique({
      where: { id: jobId },
    });

    if (!jobListing) {
      throw new NotFoundException('İlan bulunamadı');
    }

    // Sadece ilanı ekleyen kişi veya admin silebilir
    if (jobListing.createdById !== userId && !isAdminUser) {
      throw new ForbiddenException('Bu ilanı silme yetkiniz yok');
    }

    // İlanı sil (cascade ile başvurular da silinir)
    await this.prisma.jobListing.delete({
      where: { id: jobId },
    });

    return { success: true, message: 'İlan başarıyla silindi' };
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



