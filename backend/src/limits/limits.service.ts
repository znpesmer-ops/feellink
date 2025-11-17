import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { computeCapabilities } from '../roles/roles.utils';
import { CapabilitySummary, SubscriptionPlanCode } from '../roles/roles.types';
import { LIMITS } from './limits.config';

interface UserWithCapabilities {
  capabilities: CapabilitySummary;
}

@Injectable()
export class LimitsService {
  constructor(private readonly prisma: PrismaService) {}

  private getMonthStart(reference = new Date()): Date {
    return new Date(reference.getFullYear(), reference.getMonth(), 1);
  }

  private async loadUserCapabilities(userId: string): Promise<UserWithCapabilities> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        roles: true,
        plan: true,
        badges: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const plan = (user.plan as SubscriptionPlanCode) ?? 'FREE';
    const roles = Array.isArray(user.roles) ? (user.roles as string[]) : [];
    const badges = Array.isArray(user.badges) ? (user.badges as string[]) : [];

    const capabilities = computeCapabilities(roles, plan, badges);

    return { capabilities };
  }

  async ensureCanCreateEvent(userId: string): Promise<CapabilitySummary> {
    const { capabilities } = await this.loadUserCapabilities(userId);
    const { permissions, limits } = capabilities;

    if (!permissions.canCreateEvents) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'LIMIT_REACHED',
        message: 'Bu hesap tipi ile etkinlik oluşturamazsınız.',
      });
    }

    if (limits.eventCooldownMonths && limits.eventCooldownMonths > 0) {
      const since = new Date();
      since.setMonth(since.getMonth() - limits.eventCooldownMonths);

      const lastEvent = await this.prisma.event.findFirst({
        where: {
          ownerId: userId,
          createdAt: { gte: since },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (lastEvent) {
        throw new ForbiddenException({
          statusCode: 403,
          code: 'LIMIT_REACHED',
          message: `Son ${limits.eventCooldownMonths} ay içinde zaten bir etkinlik oluşturdunuz.`,
        });
      }

      return capabilities;
    }

    if (typeof limits.eventLimitMonthly === 'number') {
      const monthStart = this.getMonthStart();
      const createdThisMonth = await this.prisma.event.count({
        where: {
          ownerId: userId,
          createdAt: { gte: monthStart },
        },
      });

      if (createdThisMonth >= limits.eventLimitMonthly) {
        throw new ForbiddenException({
          statusCode: 403,
          code: 'LIMIT_REACHED',
          message: `Bu ay için etkinlik oluşturma limitinize ulaştınız. Limit: ${limits.eventLimitMonthly}.`,
        });
      }
    }

    return capabilities;
  }

  async ensureCanCreateArtwork(userId: string): Promise<CapabilitySummary> {
    const { capabilities } = await this.loadUserCapabilities(userId);
    const { permissions, limits } = capabilities;

    if (typeof limits.artworkLimitMonthly === 'number') {
      const monthStart = this.getMonthStart();
      const createdThisMonth = await this.prisma.post.count({
        where: {
          userId,
          createdAt: { gte: monthStart },
        },
      });

      if (createdThisMonth >= limits.artworkLimitMonthly) {
        throw new ForbiddenException({
          statusCode: 403,
          code: 'LIMIT_REACHED',
          message: `Bu ay için eser yükleme limitinize ulaştınız. Limit: ${limits.artworkLimitMonthly}.`,
        });
      }
      return capabilities;
    }

    if (!permissions.canCreateArtworks) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'LIMIT_REACHED',
        message: 'Bu hesap tipi ile eser oluşturamazsınız.',
      });
    }

    return capabilities;
  }

  async ensureLimit(userId: string, action: 'create_event' | 'upload_artwork' | 'create_collection' | 'create_job') {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        roles: true,
        plan: true,
        extras: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const role = Array.isArray(user.roles) && user.roles.length > 0 ? user.roles[0] : null;
    const plan = (user.plan as SubscriptionPlanCode) ?? 'FREE';

    if (!role) {
      return;
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(now.getMonth() - 6);

    const roleLimits = (LIMITS as any)[role]?.[plan] || {};

    if (action === 'create_event' && role === 'art_lover' && plan === 'FREE') {
      const eventCount = await this.prisma.event.count({
        where: { ownerId: userId, createdAt: { gte: sixMonthsAgo } },
      });

      if (eventCount >= (roleLimits.events_per_6_months || 0)) {
        throw new ForbiddenException('6 ayda 1 etkinlik hakkınıza ulaştınız.');
      }
    }

    if (action === 'upload_artwork' && (role === 'artist' || role === 'collector')) {
      const baseLimit = roleLimits.artworks_per_month || 0;
      const extra = user.extras?.includes('extra_artworks') ? roleLimits.extra_artworks || 0 : 0;
      const totalLimit = baseLimit + extra;

      if (totalLimit > 0) {
        const count = await this.prisma.post.count({
          where: { userId, createdAt: { gte: monthStart } },
        });

        if (count >= totalLimit) {
          throw new ForbiddenException(`Bu ay ${totalLimit} eser yükleme hakkınıza ulaştınız.`);
        }
      }
    }

    if (action === 'create_collection' && role === 'collector') {
      const limit = roleLimits.collections_per_month || 0;
      if (limit > 0) {
        const count = await this.prisma.collection.count({
          where: { ownerId: userId, createdAt: { gte: monthStart } },
        });

        if (count >= limit) {
          throw new ForbiddenException(`Bu ay ${limit} koleksiyon oluşturma hakkınıza ulaştınız.`);
        }
      }
    }

    if (action === 'create_job' && role === 'corporate') {
      const limit = roleLimits.job_posts_per_month || 0;
      if (limit > 0) {
        const count = await this.prisma.jobListing.count({
          where: { createdById: userId, createdAt: { gte: monthStart } },
        });

        if (count >= limit) {
          throw new ForbiddenException(`Bu ay ${limit} iş ilanı oluşturma hakkınıza ulaştınız.`);
        }
      }
    }
  }
}

