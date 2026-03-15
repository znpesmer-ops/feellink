import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

type ParticipantWithUserEvent = Prisma.EventParticipantGetPayload<{
  include: {
    user: { select: { email: true; fullName: true | null } };
    event: { select: { id: true; title: true; date: true; location: true | null } };
  };
}>;

@Injectable()
export class EventsReminderService {
  private readonly logger = new Logger(EventsReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  // ✅ 24 saat öncesi hatırlatma - Her saat çalışır
  @Cron('0 * * * *') // Her saat başı (00:00, 01:00, 02:00, ...)
  async send24HourReminders() {
    try {
      const now = new Date();
      
      // 24 saat kala penceresi: [23:00, 25:00] arası (2 saatlik tolerans)
      const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000); // 23 saat sonra
      const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000); // 25 saat sonra

      // APPROVED + reminder24hSentAt null + eventDate window içinde + soft delete değil + event reminderMailSent false
      const targets = await this.prisma.eventParticipant.findMany({
        where: {
          status: 'APPROVED',
          reminder24hSentAt: null, // 24 saat hatırlatması daha önce gönderilmemiş (participant bazlı)
          event: {
            date: {
              gte: windowStart,
              lt: windowEnd,
            },
            reminderMailSent: false, // Event bazlı kontrol - bu etkinlik için mail gönderilmemiş
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
        take: 200, // Güvenlik limiti
      });

      if (!targets.length) {
        return;
      }

      this.logger.log(`📧 Found ${targets.length} participants to send 24-hour reminders`);

      // Event bazlı grupla (aynı etkinlik için tüm katılımcıları birlikte işle)
      const eventsMap = new Map<string, typeof targets>();
      for (const target of targets) {
        const eventId = target.event.id;
        if (!eventsMap.has(eventId)) {
          eventsMap.set(eventId, []);
        }
        eventsMap.get(eventId)!.push(target);
      }

      // Her etkinlik için işle
      for (const [eventId, participants] of eventsMap.entries()) {
        let allSucceeded = true;
        const event = participants[0].event;

        // Tüm onaylı katılımcılara mail gönder
        for (const target of participants) {
          try {
            // 24 saat hatırlatma maili gönder
            await this.mailService.sendEvent24HourReminder({
              to: target.user.email,
              name: target.user.fullName || '',
              eventTitle: event.title,
              eventDate: event.date,
              location: event.location || undefined,
              eventUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/events/${eventId}`,
            });

            // İdempotency: Mail başarıyla gidince reminder24hSentAt set et (participant bazlı)
            await this.prisma.eventParticipant.update({
              where: { id: target.id },
              data: { reminder24hSentAt: new Date() },
            });

            this.logger.log(`✅ 24h reminder sent to ${target.user.email} for event: ${event.title}`);
          } catch (err) {
            allSucceeded = false;
            this.logger.error(
              `❌ 24h reminder failed: participant=${target.id} event=${eventId} user=${target.user.email}`,
              err,
            );
            // Fail olursa reminder24hSentAt yazmıyoruz → sonraki saatte tekrar dener
          }
        }

        // Tüm mailler başarılıysa event bazlı flag'i set et
        if (allSucceeded && participants.length > 0) {
          try {
            await this.prisma.event.update({
              where: { id: eventId },
              data: { reminderMailSent: true },
            });
            this.logger.log(`✅ Event reminderMailSent flag set for event: ${event.title}`);
          } catch (err) {
            this.logger.error(`❌ Failed to set reminderMailSent flag for event ${eventId}:`, err);
          }
        }
      }
    } catch (error) {
      this.logger.error('❌ Error in send24HourReminders cron job:', error);
    }
  }

  // 2 saat önce hatırlatma - Her 5 dakikada bir çalışır
  @Cron('*/5 * * * *')
  async send2HourReminders() {
    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() + 110 * 60 * 1000); // 1s 50dk sonra
      const windowEnd = new Date(now.getTime() + 130 * 60 * 1000);   // 2s 10dk sonra

      const targets = await this.prisma.eventParticipant.findMany({
        where: {
          status: 'APPROVED',
          reminder2hSentAt: null,
          event: {
            date: { gte: windowStart, lt: windowEnd },
            isDeleted: false,
            deletedAt: null,
          },
        } as Prisma.EventParticipantWhereInput,
        include: {
          user: { select: { email: true, fullName: true } },
          event: { select: { id: true, title: true, date: true, location: true } },
        },
        take: 200,
      }) as ParticipantWithUserEvent[];

      if (!targets.length) return;

      this.logger.log(`📧 Found ${targets.length} participants for 2-hour reminders`);

      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      for (const target of targets) {
        try {
          await this.mailService.sendEvent2HourReminder({
            to: target.user.email,
            name: target.user.fullName || '',
            eventTitle: target.event.title,
            eventDate: target.event.date,
            location: target.event.location || undefined,
            eventUrl: `${baseUrl}/events/${target.event.id}`,
          });
          await this.prisma.eventParticipant.update({
            where: { id: target.id },
            data: { reminder2hSentAt: new Date() } as Prisma.EventParticipantUpdateInput,
          });
          this.logger.log(`✅ 2h reminder sent to ${target.user.email} for event: ${target.event.title}`);
        } catch (err) {
          this.logger.error(`❌ 2h reminder failed: participant=${target.id} event=${target.event.id}`, err);
        }
      }
    } catch (error) {
      this.logger.error('Error in send2HourReminders cron job:', error);
    }
  }

  // Her dakika çalışır (30 dakika hatırlatma - mevcut)
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

