import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);
  // Logo URL: HARDCODED HTTPS URL (Gmail için zorunlu)
  // ❌ ÇALIŞMAZ: /logo.png, localhost, relative path, ${BASE_URL}, process.env birleştirme
  // ✅ SADECE: Hardcoded tam HTTPS URL
  // Logo dosyası: frontend/public/logo.png → production'da https://feellink.io/logo.png olarak erişilebilir olmalı
  // ÖNEMLİ: Content-Type: image/png olmalı (HTML değil!)
  // Netlify config (netlify.toml) ile static dosya servis edilmesi sağlanmalı
  private readonly logoUrl = 'https://feellink.io/logo.png';

  constructor() {
    // SMTP ayarları: MAIL_* veya SMTP_* (geriye uyumluluk için)
    const mailHost = process.env.MAIL_HOST || process.env.SMTP_HOST || 'smtp.gmail.com';
    const mailPort = Number(process.env.MAIL_PORT || process.env.SMTP_PORT) || 587;
    const mailUser = process.env.MAIL_USER || process.env.SMTP_USER;
    const mailPass = process.env.MAIL_PASS || process.env.SMTP_PASS;

    if (!mailUser || !mailPass) {
      this.logger.warn('Mail credentials not configured. Email sending will be disabled.');
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: mailHost,
      port: mailPort,
      secure: false, // true for 465, false for other ports
      auth: {
        user: mailUser,
        pass: mailPass,
      },
    });

    // 👉 SMTP bağlantısını doğrula (async, bloklamaz)
    this.transporter.verify((error, success) => {
      if (error) {
        this.logger.error('SMTP bağlantı hatası:', error.message || error);
        this.logger.warn('Email gönderimi çalışmayabilir. Lütfen MAIL_HOST, MAIL_PORT, MAIL_USER ve MAIL_PASS değerlerini kontrol edin.');
      } else {
        this.logger.log('✅ SMTP bağlantısı başarılı');
      }
    });
  }

  async sendPasswordResetMail(to: string, resetUrl: string) {
    if (!this.transporter) {
      this.logger.warn('Mail transporter not configured. Skipping email send.');
      return;
    }

    // Mail gönderen adresi: MAIL_FROM_NAME ve MAIL_FROM kullan
    const mailFromName = process.env.MAIL_FROM_NAME || 'feellink';
    const mailFrom = process.env.MAIL_FROM || 'info@feellink.io';
    const from = `"${mailFromName}" <${mailFrom}>`;

    // Anti-trim token: Gmail'in "3 nokta" gizleme algoritmasını engeller
    const antiTrimToken = `UNIQUE_${Math.random()}_${Date.now()}`;

    const html = `
      <!DOCTYPE html>
      <html lang="tr">
      <body style="margin:0;padding:0;background:#f5f7fa;">
      <span style="opacity:0; font-size:0; line-height:0;">${antiTrimToken}</span>
      
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f5f7fa;padding:40px 0;">
        <tr>
          <td align="center">
            
            <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;padding:24px 40px;border:1px solid #e8e8e8;box-shadow:0 4px 12px rgba(0,0,0,0.12);">
              
              <!-- Logo -->
              <tr>
                <td align="center" style="padding:12px 0 8px 0;">
                  <img
                    src="${this.logoUrl}"
                    width="100"
                    alt="feellink"
                    style="display:block"
                  />
                </td>
              </tr>

              <!-- Gradient Çizgi -->
              <tr>
                <td style="padding:0;">
                  <div style="height:6px;width:100%;border-radius:4px;background:linear-gradient(90deg,#F28C28,#2A72FF);"></div>
                </td>
              </tr>

              <!-- Başlık -->
              <tr>
                <td align="center" style="padding-top:28px;">
                  <h1 style="margin:0;font-size:22px;color:#222;font-weight:700;font-family:Arial,Helvetica,sans-serif;">
                    Feellink Şifre Sıfırlama
                  </h1>
                </td>
              </tr>

              <!-- Açıklama -->
              <tr>
                <td style="padding-top:18px;">
                  <p style="margin:0;font-size:15px;color:#444;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
                    Merhaba,
                    <br><br>
                    Feellink hesabınız için bir şifre sıfırlama isteği aldık.
                    Yeni şifrenizi belirlemek için aşağıdaki turuncu butona tıklayın.
                  </p>
                </td>
              </tr>

              <!-- BUTON (Artık Gmail tarafından GİZLENMEZ) -->
              <tr>
                <td align="center" style="padding:30px 0 10px 0;">
                  <a href="${resetUrl}" style="
                    background:#F28C28;
                    color:#ffffff;
                    padding:14px 34px;
                    border-radius:30px;
                    font-size:16px;
                    font-weight:600;
                    text-decoration:none;
                    font-family:Arial,Helvetica,sans-serif;
                    display:inline-block;
                  ">
                    Şifremi Sıfırla
                  </a>
                </td>
              </tr>

              <!-- Not -->
              <tr>
                <td style="padding-top:20px;">
                  <p style="margin:0;font-size:13px;color:#777;line-height:1.5;font-family:Arial,Helvetica,sans-serif;">
                    Eğer bu isteği siz yapmadıysanız, bu e-postayı yok sayabilirsiniz.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding-top:24px;">
                  <hr style="border:none;border-top:1px solid #eaeaea;">
                </td>
              </tr>

              <tr>
                <td align="center" style="padding-top:12px;">
                  <p style="margin:0;font-size:12px;color:#999;font-family:Arial,Helvetica,sans-serif;line-height:1.5;">
                    <strong>Feellink</strong> – Sanat daha anlamlı.
                    <br>
                    Bu e-posta otomatik olarak gönderilmiştir, lütfen yanıtlamayınız.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>

      </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from,
        to,
        subject: 'Feellink Şifre Sıfırlama Bağlantısı',
        html,
      });
      this.logger.log(`Password reset email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${to}:`, error);
      throw error;
    }
  }

  async sendEventReminder(params: {
    to: string;
    name: string;
    eventTitle: string;
    eventDate: Date;
    location?: string;
  }) {
    if (!this.transporter) {
      this.logger.warn('Mail transporter not configured. Skipping email send.');
      return;
    }

    const mailFromName = process.env.MAIL_FROM_NAME || 'feellink';
    const mailFrom = process.env.MAIL_FROM || 'info@feellink.io';
    const from = `"${mailFromName}" <${mailFrom}>`;

    const subject = `Etkinlik hatırlatma: ${params.eventTitle} (30 dk kaldı)`;

    // Türkçe tarih formatı
    const eventDateFormatted = params.eventDate.toLocaleString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const html = `
      <!DOCTYPE html>
      <html lang="tr">
      <body style="margin:0;padding:0;background:#f5f7fa;">
      
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f5f7fa;padding:40px 0;">
        <tr>
          <td align="center">
            
            <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;padding:24px 40px;border:1px solid #e8e8e8;box-shadow:0 4px 12px rgba(0,0,0,0.12);">
              
              <!-- Logo -->
              <tr>
                <td align="center" style="padding:12px 0 8px 0;">
                  <img
                    src="${this.logoUrl}"
                    width="100"
                    alt="feellink"
                    style="display:block"
                  />
                </td>
              </tr>

              <!-- Gradient Çizgi -->
              <tr>
                <td style="padding:0;">
                  <div style="height:6px;width:100%;border-radius:4px;background:linear-gradient(90deg,#F28C28,#2A72FF);"></div>
                </td>
              </tr>

              <!-- Başlık -->
              <tr>
                <td align="center" style="padding-top:28px;">
                  <h1 style="margin:0;font-size:22px;color:#222;font-weight:700;font-family:Arial,Helvetica,sans-serif;">
                    Etkinliğinize 30 dakika kaldı
                  </h1>
                </td>
              </tr>

              <!-- Açıklama -->
              <tr>
                <td style="padding-top:18px;">
                  <p style="margin:0;font-size:15px;color:#444;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
                    Merhaba ${params.name || ''},
                    <br><br>
                    <strong>${params.eventTitle}</strong> etkinliği için katılımınız onaylandı.
                  </p>
                </td>
              </tr>

              <!-- Etkinlik Bilgileri -->
              <tr>
                <td style="padding-top:20px;">
                  <div style="background:#f8f9fa;border-radius:8px;padding:16px;border-left:4px solid #F28C28;">
                    <p style="margin:0 0 8px 0;font-size:14px;color:#666;font-family:Arial,Helvetica,sans-serif;">
                      <strong style="color:#222;">Tarih/Saat:</strong> ${eventDateFormatted}
                    </p>
                    ${params.location ? `
                    <p style="margin:0;font-size:14px;color:#666;font-family:Arial,Helvetica,sans-serif;">
                      <strong style="color:#222;">Konum:</strong> ${params.location}
                    </p>
                    ` : ''}
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding-top:24px;">
                  <hr style="border:none;border-top:1px solid #eaeaea;">
                </td>
              </tr>

              <tr>
                <td align="center" style="padding-top:12px;">
                  <p style="margin:0;font-size:12px;color:#999;font-family:Arial,Helvetica,sans-serif;line-height:1.5;">
                    <strong>Feellink</strong> – Sanat daha anlamlı.
                    <br>
                    Görüşmek üzere!
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>

      </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from,
        to: params.to,
        subject,
        html,
      });
      this.logger.log(`Event reminder email sent to ${params.to} for event: ${params.eventTitle}`);
    } catch (error) {
      this.logger.error(`Failed to send event reminder email to ${params.to}:`, error);
      throw error;
    }
  }
}

