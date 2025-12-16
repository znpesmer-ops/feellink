import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class EventsReminderService {
  private readonly logger = new Logger(EventsReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  // Her dakika çalışır
  @Cron('*/1 * * * *')
  async send30MinReminders() {
    try {
      const now = new Date();

      // 30 dk kala penceresi: [29:00, 30:59] gibi küçük tolerans verelim
      const windowStart = new Date(now.getTime() + 29 * 60 * 1000);
      const windowEnd = new Date(now.getTime() + 31 * 60 * 1000);

      // APPROVED + reminderSentAt null + eventDate window içinde + soft delete değil
      const targets = await this.prisma.eventParticipant.findMany({
        where: {
          status: 'APPROVED',
          reminderSentAt: null,
          event: {
            date: {
              gte: windowStart,
              lt: windowEnd,
            },
            isDeleted: false,
            deletedAt: null,
          },
        },
        include: {
          user: {
            select: {
              email: true,
              fullName: true,
            },
          },
          event: {
            select: {
              id: true,
              title: true,
              date: true,
              location: true,
            },
          },
        },
        take: 200, // güvenlik limiti
      });

      if (!targets.length) {
        return;
      }

      this.logger.log(`Found ${targets.length} participants to send reminders for events starting in ~30 minutes`);

      for (const target of targets) {
        try {
          // Mail içeriği (feellink dili)
          await this.mailService.sendEventReminder({
            to: target.user.email,
            name: target.user.fullName || '',
            eventTitle: target.event.title,
            eventDate: target.event.date,
            location: target.event.location || undefined,
          });

          // idempotency işareti - sadece mail başarıyla gidince set edilir
          await this.prisma.eventParticipant.update({
            where: { id: target.id },
            data: { reminderSentAt: new Date() },
          });

          this.logger.log(`Reminder sent to ${target.user.email} for event: ${target.event.title}`);
        } catch (err) {
          this.logger.error(
            `Reminder failed: participant=${target.id} event=${target.event.id} user=${target.user.email}`,
            err,
          );
          // Fail olursa reminderSentAt yazmıyoruz → sonraki dakikada tekrar dener
        }
      }
    } catch (error) {
      this.logger.error('Error in send30MinReminders cron job:', error);
    }
  }
}

