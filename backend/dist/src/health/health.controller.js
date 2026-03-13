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
Object.defineProperty(exports, "__esModule", { value: true });
exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
let HealthController = class HealthController {
    health() {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            service: 'Feellink Backend API',
        };
    }
    mailStatus() {
        const mailMode = process.env.MAIL_MODE || '(not set)';
        const hasUser = !!(process.env.SMTP_USER ||
            process.env.SNTP_USER ||
            process.env.MAIL_USER);
        const hasPass = !!(process.env.SMTP_PASS ||
            process.env.SNTP_PASS ||
            process.env.MAIL_PASS);
        const smtpHost = process.env.SMTP_HOST ||
            process.env.SNTP_HOST ||
            process.env.MAIL_HOST ||
            '(default)';
        const resetLinkBase = process.env.FRONTEND_URL || process.env.APP_URL || '(not set)';
        const explicitlyDev = process.env.MAIL_MODE?.toLowerCase() === 'dev';
        const willSend = (hasUser && hasPass && !explicitlyDev);
        return {
            mailMode,
            smtpConfigured: hasUser && hasPass,
            smtpHost,
            resetLinkBase,
            willActuallySendMails: willSend,
            envNamesNote: 'SMTP_*, SNTP_* veya MAIL_* kullanılır. Reset link: FRONTEND_URL veya APP_URL.',
            hint: willSend
                ? 'Env görünüyor. Mail gitmiyorsa Vercel loglarında "SMTP bağlantısı başarılı" veya EAUTH/535 hata mesajını kontrol et.'
                : !hasUser || !hasPass
                    ? 'SMTP_USER/SMTP_PASS (veya MAIL_*) backend projesinde tanımlı değil. İsimler SMTP_* olmalı (SNTP değil).'
                    : 'MAIL_MODE=dev ise mail atılmaz. Kaldırın veya prod yapın.',
        };
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthController.prototype, "health", null);
__decorate([
    (0, common_1.Get)('mail'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], HealthController.prototype, "mailStatus", null);
exports.HealthController = HealthController = __decorate([
    (0, common_1.Controller)('health')
], HealthController);
//# sourceMappingURL=health.controller.js.map