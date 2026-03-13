import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UsersService } from './users.service';

@Injectable()
export class UsersScheduler {
  constructor(private usersService: UsersService) {}

  /** 15 gün dolan PENDING_DELETION hesaplarını kalıcı siler (günde bir çalışır). */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async purgeScheduledDeletions() {
    try {
      const purged = await this.usersService.purgeScheduledDeletions();
      if (purged > 0) {
        console.log(`[UsersScheduler] Purged ${purged} account(s) after grace period.`);
      }
    } catch (error: any) {
      console.error('[UsersScheduler] purgeScheduledDeletions error:', error?.message || error);
    }
  }
}
