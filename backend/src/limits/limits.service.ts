import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { computeCapabilities } from '../roles/roles.utils';
import { CapabilitySummary, SubscriptionPlanCode } from '../roles/roles.types';

interface UserWithCapabilities {
  capabilities: CapabilitySummary;
}

@Injectable()
export class LimitsService {
  constructor(private readonly prisma: PrismaService) {}

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
    // 🔥 KRİTİK: Admin kontrolü - Admin her şeyi yapabilmeli
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        roles: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const roles = Array.isArray(user.roles) ? (user.roles as string[]) : [];
    const isAdmin = roles.includes('ADMIN') || roles.some((r: string) => r.toUpperCase() === 'ADMIN');

    // Admin ise direkt izin ver
    if (isAdmin) {
      const { capabilities } = await this.loadUserCapabilities(userId);
      return capabilities;
    }

    const { capabilities } = await this.loadUserCapabilities(userId);
    const { permissions } = capabilities;

    if (!permissions.canCreateEvents) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'LIMIT_REACHED',
        message: 'Bu hesap tipi ile etkinlik oluşturamazsınız.',
      });
    }

    return capabilities;
  }

  async ensureCanCreateArtwork(userId: string): Promise<CapabilitySummary> {
    // 🔥 KRİTİK: Admin kontrolü - Admin her şeyi yapabilmeli
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        roles: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const roles = Array.isArray(user.roles) ? (user.roles as string[]) : [];
    const isAdmin = roles.includes('ADMIN') || roles.some((r: string) => r.toUpperCase() === 'ADMIN');

    // Admin ise direkt izin ver
    if (isAdmin) {
      const { capabilities } = await this.loadUserCapabilities(userId);
      return capabilities;
    }

    const { capabilities } = await this.loadUserCapabilities(userId);
    const { permissions } = capabilities;

    if (!permissions.canCreateArtworks) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'LIMIT_REACHED',
        message: 'Bu hesap tipi ile eser oluşturamazsınız.',
      });
    }

    return capabilities;
  }
}

