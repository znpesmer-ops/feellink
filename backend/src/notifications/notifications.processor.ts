import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { PrismaService } from '../prisma/prisma.service';

@Processor('notifications')
export class NotificationsProcessor extends WorkerHost {
  constructor(
    private notificationsService: NotificationsService,
    private notificationsGateway: NotificationsGateway,
    private prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<any>) {
    const { name, data } = job;

    if (name === 'create-notification') {
      // createNotificationSync zaten socket gönderiyor, burada sadece çağır
      const notification = await this.notificationsService.createNotificationSync(data);
      return notification;
    }

    return null;
  }
}


