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
var PrismaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
let PrismaService = PrismaService_1 = class PrismaService extends client_1.PrismaClient {
    constructor() {
        const url = process.env.DATABASE_URL ||
            process.env.MONGODB_URI ||
            process.env.DATABASE_URI;
        super({
            datasources: {
                db: { url: url || undefined },
            },
        });
        this.logger = new common_1.Logger(PrismaService_1.name);
    }
    async onModuleInit() {
        const url = process.env.DATABASE_URL ||
            process.env.MONGODB_URI ||
            process.env.DATABASE_URI;
        if (!url || url.trim() === '') {
            this.logger.warn('⚠️ DATABASE_URL (veya MONGODB_URI / DATABASE_URI) eksik');
            if (process.env.VERCEL)
                return;
            throw new Error('DATABASE_URL is not set');
        }
        this.logger.log(`📦 Prisma bağlantı denenecek (env: ${process.env.DATABASE_URL ? 'DATABASE_URL' : process.env.MONGODB_URI ? 'MONGODB_URI' : 'DATABASE_URI'})`);
        try {
            await this.$connect();
            this.logger.log('✅ Prisma connected');
        }
        catch (err) {
            this.logger.error('❌ Prisma connection failed', err);
            if (process.env.VERCEL)
                return;
            throw err;
        }
    }
    async onModuleDestroy() {
        await this.$disconnect();
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = PrismaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], PrismaService);
//# sourceMappingURL=prisma.service.js.map