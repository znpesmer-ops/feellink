import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class TicketMailerService {
  private readonly logger = new Logger(TicketMailerService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    // Test transporter (production için .env'den al)
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

  async sendTicketEmail(to: string, data: { eventTitle: string; code: string; qrDataUrl: string }) {
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

      // Mail gönderen adresi: MAIL_FROM_NAME ve MAIL_FROM kullan (mail.service.ts ile tutarlı)
      const mailFromName = process.env.MAIL_FROM_NAME || 'feellink';
      const mailFrom = process.env.MAIL_FROM || 'info@feellink.io';
      
      await this.transporter.sendMail({
        from: `"${mailFromName}" <${mailFrom}>`,
        to,
        subject: `🎟️ ${data.eventTitle} - Biletiniz`,
        html,
      });

      this.logger.log(`Ticket email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send ticket email to ${to}:`, error);
      throw error;
    }
  }
}

