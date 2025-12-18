import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReportReason } from '@prisma/client';
import { MailService } from '../mail/mail.service';

@Injectable()
export class ReportsService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async createReport(
    reporterId: string,
    reportedUserId: string,
    reason: ReportReason,
    conversationId?: string,
    messageId?: string,
    note?: string,
  ) {
    if (reporterId === reportedUserId) {
      throw new BadRequestException('Cannot report yourself');
    }

    // Kullanıcı var mı kontrol et
    const reportedUser = await this.prisma.user.findUnique({
      where: { id: reportedUserId },
    });

    if (!reportedUser) {
      throw new NotFoundException('User not found');
    }

    // Conversation var mı kontrol et (eğer verildiyse)
    if (conversationId) {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { participants: true },
      });

      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }

      // Reporter'ın bu conversation'a erişimi var mı kontrol et
      const hasAccess = conversation.participants.some((p) => p.userId === reporterId);
      if (!hasAccess) {
        throw new BadRequestException('Access denied to conversation');
      }
    }

    // Şikayet oluştur
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

    // Admin'lere bildirim oluştur
    const admins = await this.prisma.user.findMany({
      where: {
        OR: [{ isAdmin: true }, { superAdmin: true }],
      },
      select: { id: true },
    });

    // Her admin'e bildirim gönder
    await Promise.all(
      admins.map((admin) =>
        this.prisma.notification.create({
          data: {
            userId: admin.id,
            type: 'REPORT_CREATED',
            message: `Yeni şikayet: ${report.reportedUser.username}`,
            fromUserId: reporterId,
          },
        }),
      ),
    );

    return report;
  }

  async getReports(status?: string, page: number = 1, limit: number = 20) {
    const where: any = {};
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

  async updateReportStatus(reportId: string, status: string) {
    const validStatuses = ['OPEN', 'REVIEWING', 'RESOLVED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      throw new BadRequestException('Invalid status');
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
      throw new NotFoundException('Report not found');
    }

    // Şikayet durumunu güncelle
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

    // Eğer şikayet "RESOLVED" durumuna alındıysa ve daha önce RESOLVED değilse, mail gönder
    if (status === 'RESOLVED' && report.status !== 'RESOLVED') {
      // Mail gönderimini async olarak yap, admin işlemini engelleme
      this.sendReportResolvedEmail(updatedReport).catch((error) => {
        // Hata durumunda sadece logla, admin işlemini etkileme
        console.error('Failed to send report resolved email:', error);
      });
    }

    return updatedReport;
  }

  private async sendReportResolvedEmail(report: any) {
    // Reporter'ın email'i yoksa mail gönderme
    if (!report.reporter?.email) {
      return;
    }

    try {
      await this.mailService.sendReportResolvedEmail({
        to: report.reporter.email,
        userName: report.reporter.fullName || report.reporter.username,
        reportedUser: report.reportedUser.username,
      });
    } catch (error) {
      // Mail gönderilemezse sadece logla, admin işlemini engelleme
      console.error('Error sending report resolved email:', error);
    }
  }

  async getReportById(reportId: string) {
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
      throw new NotFoundException('Report not found');
    }

    return report;
  }
}

