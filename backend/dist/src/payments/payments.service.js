"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PaymentsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const stripe_1 = require("stripe");
const prisma_service_1 = require("../prisma/prisma.service");
const users_service_1 = require("../users/users.service");
let PaymentsService = PaymentsService_1 = class PaymentsService {
    constructor(configService, prisma, usersService) {
        this.configService = configService;
        this.prisma = prisma;
        this.usersService = usersService;
        this.logger = new common_1.Logger(PaymentsService_1.name);
        try {
            const secretKey = this.configService.get('STRIPE_SECRET_KEY');
            if (!secretKey) {
                this.logger.warn('STRIPE_SECRET_KEY is not configured. Payment features will be disabled.');
                this.stripe = null;
                this.webhookSecret = null;
                return;
            }
            this.stripe = new stripe_1.default(secretKey);
            this.webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET') ?? null;
        }
        catch (error) {
            this.logger.error('PaymentsService constructor error:', error?.message || error);
            this.logger.warn('Payment features will be disabled due to initialization error.');
            this.stripe = null;
            this.webhookSecret = null;
        }
    }
    async getUserEmail(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { email: true },
        });
        if (!user?.email) {
            throw new common_1.NotFoundException('Kullanıcı e-posta adresi bulunamadı');
        }
        return user.email;
    }
    async createCheckoutSession(dto) {
        if (!this.stripe) {
            throw new common_1.BadRequestException('Payment service is not configured. Please contact support.');
        }
        const { userId, plan, extras = [] } = dto;
        const extrasList = Array.isArray(extras) ? extras : [];
        const lineItems = [];
        const normalizedPlan = plan;
        const planAmount = PaymentsService_1.PLAN_PRICES_TRY[normalizedPlan];
        if (!planAmount) {
            throw new common_1.BadRequestException('Geçersiz plan seçimi');
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
            const extraCode = extraCodeRaw;
            const extraAmount = PaymentsService_1.EXTRA_PRICES_TRY[extraCode];
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
            throw new common_1.BadRequestException('Ödeme için uygun paket bulunamadı');
        }
        try {
            const frontendUrl = this.configService.get('FRONTEND_URL') ?? 'http://localhost:3000';
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
        }
        catch (error) {
            this.logger.error('Stripe ödeme oturumu oluşturulamadı', error instanceof Error ? error.stack : undefined);
            throw new common_1.InternalServerErrorException('Ödeme işlemi başlatılamadı. Lütfen daha sonra tekrar deneyin.');
        }
    }
    parseExtrasMetadata(value) {
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
                    .filter((item) => item in PaymentsService_1.EXTRA_ROLE_MAP);
            }
        }
        catch (error) {
            this.logger.warn(`Stripe metadata extras parse error: ${error.message}`);
        }
        return [];
    }
    async handleCheckoutCompleted(session) {
        const metadata = session.metadata ?? {};
        const userId = metadata.userId;
        const planCode = metadata.plan;
        if (!userId) {
            this.logger.warn('Stripe checkout tamamlandı ancak kullanıcı bilgisi yok.');
            return;
        }
        if (!planCode || !(planCode in PaymentsService_1.PLAN_ROLE_MAP)) {
            this.logger.warn(`Stripe checkout tamamlandı ancak geçersiz plan code: ${planCode}`);
            return;
        }
        const extras = this.parseExtrasMetadata(metadata.extras);
        const roles = new Set();
        roles.add(PaymentsService_1.PLAN_ROLE_MAP[planCode]);
        extras.forEach((extra) => {
            const mappedRole = PaymentsService_1.EXTRA_ROLE_MAP[extra];
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
        }
        catch (error) {
            this.logger.error('Ödeme sonrası kullanıcı bilgileri güncellenemedi', error instanceof Error ? error.stack : undefined);
            throw error;
        }
    }
    async handleWebhook(rawBody, signature) {
        if (!this.stripe || !this.webhookSecret) {
            this.logger.error('Stripe webhook secret yapılandırılmamış.');
            throw new common_1.InternalServerErrorException('Payment service is not configured. Webhook processing is disabled.');
        }
        let event;
        try {
            event = this.stripe.webhooks.constructEvent(rawBody, Array.isArray(signature) ? signature[0] : signature ?? '', this.webhookSecret);
        }
        catch (error) {
            this.logger.error('Stripe webhook doğrulaması başarısız', error instanceof Error ? error.stack : undefined);
            throw new common_1.BadRequestException('Geçersiz webhook imzası');
        }
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            await this.handleCheckoutCompleted(session);
        }
        return { received: true };
    }
};
exports.PaymentsService = PaymentsService;
PaymentsService.PLAN_PRICES_TRY = {
    sanatsever_pro: 49,
    kurumsal_pro: 149,
    koleksiyoner_pro: 119,
    sanatci_pro: 119,
};
PaymentsService.EXTRA_PRICES_TRY = {
    'koleksiyoner-extra': 49,
    'sanatci-extra': 49,
};
PaymentsService.PLAN_ROLE_MAP = {
    sanatsever_pro: 'art_lover',
    kurumsal_pro: 'corporate',
    koleksiyoner_pro: 'collector',
    sanatci_pro: 'artist',
};
PaymentsService.EXTRA_ROLE_MAP = {
    'koleksiyoner-extra': 'collector',
    'sanatci-extra': 'artist',
};
exports.PaymentsService = PaymentsService = PaymentsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        users_service_1.UsersService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map