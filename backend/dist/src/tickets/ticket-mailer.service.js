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
var TicketMailerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TicketMailerService = void 0;
const common_1 = require("@nestjs/common");
const nodemailer = require("nodemailer");
let TicketMailerService = TicketMailerService_1 = class TicketMailerService {
    constructor() {
        this.logger = new common_1.Logger(TicketMailerService_1.name);
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }
    async sendTicketEmail(to, data) {
        try {
            const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #ff7b00; margin-bottom: 20px;">🎟️ ${data.eventTitle} için biletiniz hazır</h2>
          <div style="background-color: #f8f8f8; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
            <p style="font-size: 16px; margin-bottom: 10px;"><strong>Bilet Kodu:</strong></p>
            <p style="font-size: 24px; font-weight: bold; color: #ff7b00; margin: 0;">${data.code}</p>
          </div>
          <p style="color: #666; margin-bottom: 20px;">
            Bu bilet ile etkinliğe giriş yapabilirsiniz. QR kodu gösterin veya bu maili gösterin.
          </p>
          <div style="text-align: center; margin: 20px 0;">
            <img src="${data.qrDataUrl}" alt="QR" style="width:200px;height:200px; border-radius: 8px;" />
          </div>
          <p style="color: #999; font-size: 14px; margin-top: 30px;">
            Teşekkürler — Feellink
          </p>
        </div>
      `;
            const mailFromName = process.env.MAIL_FROM_NAME || 'feellink';
            const mailFrom = process.env.MAIL_FROM || 'info@feellink.io';
            await this.transporter.sendMail({
                from: `"${mailFromName}" <${mailFrom}>`,
                to,
                subject: `🎟️ ${data.eventTitle} - Biletiniz`,
                html,
            });
            this.logger.log(`Ticket email sent to ${to}`);
        }
        catch (error) {
            this.logger.error(`Failed to send ticket email to ${to}:`, error);
            throw error;
        }
    }
};
exports.TicketMailerService = TicketMailerService;
exports.TicketMailerService = TicketMailerService = TicketMailerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], TicketMailerService);
//# sourceMappingURL=ticket-mailer.service.js.map