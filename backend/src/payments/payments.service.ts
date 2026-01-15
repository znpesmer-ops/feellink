import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { UsersService } from '../users/users.service';
import { UserRoleCode } from '../roles/roles.types';

type PlanCode =
  | 'sanatsever_pro'
  | 'kurumsal_pro'
  | 'koleksiyoner_pro'
  | 'sanatci_pro';

type ExtraCode = 'koleksiyoner-extra' | 'sanatci-extra';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly stripe: Stripe | null;
  private readonly webhookSecret: string | null;

  private static readonly PLAN_PRICES_TRY: Record<PlanCode, number> = {
    sanatsever_pro: 49,
    kurumsal_pro: 149,
    koleksiyoner_pro: 119,
    sanatci_pro: 119,
  };

  private static readonly EXTRA_PRICES_TRY: Record<ExtraCode, number> = {
    'koleksiyoner-extra': 49,
    'sanatci-extra': 49,
  };

  private static readonly PLAN_ROLE_MAP: Record<PlanCode, UserRoleCode> = {
    sanatsever_pro: 'art_lover',
    kurumsal_pro: 'corporate',
    koleksiyoner_pro: 'collector',
    sanatci_pro: 'artist',
  };

  private static readonly EXTRA_ROLE_MAP: Record<ExtraCode, UserRoleCode> = {
    'koleksiyoner-extra': 'collector',
    'sanatci-extra': 'artist',
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {
    try {
      const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');

      if (!secretKey) {
        this.logger.warn('STRIPE_SECRET_KEY is not configured. Payment features will be disabled.');
        this.stripe = null as any;
        this.webhookSecret = null;
        return;
      }

      this.stripe = new Stripe(secretKey, {
        apiVersion: '2024-04-10',
      });
      this.webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET') ?? null;
    } catch (error: any) {
      this.logger.error('PaymentsService constructor error:', error?.message || error);
      this.logger.warn('Payment features will be disabled due to initialization error.');
      this.stripe = null as any;
      this.webhookSecret = null;
    }
  }

  private async getUserEmail(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!user?.email) {
      throw new NotFoundException('Kullanıcı e-posta adresi bulunamadı');
    }

    return user.email;
  }

  async createCheckoutSession(dto: CreateCheckoutSessionDto) {
    if (!this.stripe) {
      throw new BadRequestException('Payment service is not configured. Please contact support.');
    }

    const { userId, plan, extras = [] } = dto;
    const extrasList = Array.isArray(extras) ? extras : [];

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    const normalizedPlan = plan as PlanCode;
    const planAmount = PaymentsService.PLAN_PRICES_TRY[normalizedPlan];

    if (!planAmount) {
      throw new BadRequestException('Geçersiz plan seçimi');
    }

    lineItems.push({
      price_data: {
        currency: 'try',
        unit_amount: planAmount * 100,
        recurring: { interval: 'month' },
        product_data: {
          name: normalizedPlan.replace(/_/g, ' ').toUpperCase(),
        },
      },
      quantity: 1,
    });

    extrasList.forEach((extraCodeRaw) => {
      const extraCode = extraCodeRaw as ExtraCode;
      const extraAmount = PaymentsService.EXTRA_PRICES_TRY[extraCode];

      if (!extraAmount) {
        this.logger.warn(`Geçersiz ek paket kodu: ${extraCodeRaw}`);
        return;
      }

      lineItems.push({
        price_data: {
          currency: 'try',
          unit_amount: extraAmount * 100,
          recurring: { interval: 'month' },
          product_data: {
                name: extraCode.replace(/[-_]/g, ' ').toUpperCase(),
          },
        },
        quantity: 1,
      });
    });

    if (lineItems.length === 0) {
      throw new BadRequestException('Ödeme için uygun paket bulunamadı');
    }

    try {
      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
      const email = await this.getUserEmail(userId);

      const session = await this.stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        customer_email: email,
        line_items: lineItems,
        success_url: `${frontendUrl}/payment-success`,
        cancel_url: `${frontendUrl}/payment-failed`,
        metadata: {
          userId,
          plan: normalizedPlan,
          extras: JSON.stringify(extrasList),
        },
      });

      return session;
    } catch (error) {
      this.logger.error(
        'Stripe ödeme oturumu oluşturulamadı',
        error instanceof Error ? error.stack : undefined,
      );

      throw new InternalServerErrorException(
        'Ödeme işlemi başlatılamadı. Lütfen daha sonra tekrar deneyin.',
      );
    }
  }

  private parseExtrasMetadata(value: string | undefined | null): ExtraCode[] {
    if (!value) {
      return [];
    }

    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => {
            if (item === 'collector_extra' || item === 'koleksiyoner_extra') {
              return 'koleksiyoner-extra';
            }
            if (item === 'artist_extra' || item === 'sanatci_extra') {
              return 'sanatci-extra';
            }
            return item;
          })
          .filter((item): item is ExtraCode => item in PaymentsService.EXTRA_ROLE_MAP);
      }
    } catch (error) {
      this.logger.warn(`Stripe metadata extras parse error: ${(error as Error).message}`);
    }

    return [];
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const metadata = session.metadata ?? {};
    const userId = metadata.userId;
    const planCode = metadata.plan as PlanCode | undefined;

    if (!userId) {
      this.logger.warn('Stripe checkout tamamlandı ancak kullanıcı bilgisi yok.');
      return;
    }

    if (!planCode || !(planCode in PaymentsService.PLAN_ROLE_MAP)) {
      this.logger.warn(`Stripe checkout tamamlandı ancak geçersiz plan code: ${planCode}`);
      return;
    }

    const extras = this.parseExtrasMetadata(metadata.extras);
    const roles = new Set<UserRoleCode>();

    roles.add(PaymentsService.PLAN_ROLE_MAP[planCode]);

    extras.forEach((extra) => {
      const mappedRole = PaymentsService.EXTRA_ROLE_MAP[extra];
      if (mappedRole) {
        roles.add(mappedRole);
      }
    });

        try {
          await this.usersService.updateRoles(userId, {
            roles: Array.from(roles),
            plan: 'PRO',
            extras,
          });
    } catch (error) {
      this.logger.error(
        'Ödeme sonrası kullanıcı bilgileri güncellenemedi',
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async handleWebhook(rawBody: Buffer, signature: string | string[] | undefined) {
    if (!this.stripe || !this.webhookSecret) {
      this.logger.error('Stripe webhook secret yapılandırılmamış.');
      throw new InternalServerErrorException('Payment service is not configured. Webhook processing is disabled.');
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        Array.isArray(signature) ? signature[0] : signature ?? '',
        this.webhookSecret,
      );
    } catch (error) {
      this.logger.error(
        'Stripe webhook doğrulaması başarısız',
        error instanceof Error ? error.stack : undefined,
      );
      throw new BadRequestException('Geçersiz webhook imzası');
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      await this.handleCheckoutCompleted(session);
    }

    return { received: true };
  }
}


