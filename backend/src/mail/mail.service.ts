import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    const mailHost = process.env.MAIL_HOST || 'smtp.gmail.com';
    const mailPort = Number(process.env.MAIL_PORT) || 587;
    const mailUser = process.env.MAIL_USER;
    const mailPass = process.env.MAIL_PASS;

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

    const from = process.env.MAIL_FROM || process.env.MAIL_USER || 'Feellink <noreply@feellink.com>';

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
}

