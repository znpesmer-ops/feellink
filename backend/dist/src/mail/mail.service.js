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
var MailService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MailService = void 0;
const common_1 = require("@nestjs/common");
const nodemailer = require("nodemailer");
let MailService = MailService_1 = class MailService {
    constructor() {
        this.transporter = null;
        this.logger = new common_1.Logger(MailService_1.name);
        this.logoUrl = 'https://feellink.io/logo.png';
        try {
            const mailHost = process.env.MAIL_HOST ||
                process.env.SMTP_HOST ||
                process.env.SNTP_HOST ||
                'smtp.gmail.com';
            const mailPort = Number(process.env.MAIL_PORT ||
                process.env.SMTP_PORT ||
                process.env.SNTP_PORT) || 587;
            const mailUser = process.env.MAIL_USER ||
                process.env.SMTP_USER ||
                process.env.SNTP_USER;
            const mailPass = process.env.MAIL_PASS ||
                process.env.SMTP_PASS ||
                process.env.SNTP_PASS;
            if (!mailUser || !mailPass) {
                this.logger.warn('Mail credentials not configured. Email sending will be disabled.');
                this.logger.warn(`MailService init: MAIL_MODE="${process.env.MAIL_MODE ?? '(not set)'}", transporter=null (no SMTP_USER/SMTP_PASS).`);
                this.transporter = null;
                return;
            }
            const isGmail = mailHost.includes('gmail.com');
            this.transporter = nodemailer.createTransport({
                host: mailHost,
                port: mailPort,
                secure: mailPort === 465,
                auth: {
                    user: mailUser,
                    pass: mailPass,
                },
                ...(isGmail && {
                    service: 'gmail',
                    tls: {
                        rejectUnauthorized: false,
                    },
                }),
            });
            this.logger.log(`MailService init: MAIL_MODE="${process.env.MAIL_MODE ?? '(not set)'}", transporter=configured.`);
            this.transporter.verify((error, success) => {
                if (error) {
                    this.logger.error('SMTP bağlantı hatası:', error.message || error);
                    this.logger.error('SMTP Detayları:', {
                        host: mailHost,
                        port: mailPort,
                        user: mailUser,
                        passLength: mailPass?.length || 0,
                    });
                    this.logger.warn('Email gönderimi çalışmayabilir. Lütfen SMTP ayarlarını kontrol edin:');
                    this.logger.warn('- Gmail kullanıyorsanız, App Password kullanmalısınız (2FA açık olmalı)');
                    this.logger.warn('- SMTP_USER tam e-posta adresi olmalı (örn: info@feellink.io)');
                    this.logger.warn('- SMTP_PASS App Password olmalı (normal şifre değil)');
                }
                else {
                    this.logger.log('✅ SMTP bağlantısı başarılı');
                }
            });
        }
        catch (error) {
            this.logger.error('MailService constructor error:', error?.message || error);
            this.logger.warn(`MailService init: MAIL_MODE="${process.env.MAIL_MODE ?? '(not set)'}", transporter=null (error).`);
            this.logger.warn('Email sending will be disabled due to initialization error.');
            this.transporter = null;
        }
    }
    isProductionMailMode() {
        const mode = (process.env.MAIL_MODE || 'dev').toLowerCase();
        const explicitlyDev = process.env.MAIL_MODE?.toLowerCase() === 'dev';
        return (mode === 'prod' ||
            mode === 'production' ||
            (process.env.NODE_ENV === 'production' && !explicitlyDev));
    }
    ensureTransporter() {
        if (this.transporter)
            return this.transporter;
        const mailUser = process.env.MAIL_USER ||
            process.env.SMTP_USER ||
            process.env.SNTP_USER;
        const mailPass = process.env.MAIL_PASS ||
            process.env.SMTP_PASS ||
            process.env.SNTP_PASS;
        if (!mailUser || !mailPass) {
            this.logger.warn('ensureTransporter: MAIL_USER/SMTP_USER veya MAIL_PASS/SMTP_PASS env\'de yok.');
            return null;
        }
        const mailHost = process.env.MAIL_HOST ||
            process.env.SMTP_HOST ||
            process.env.SNTP_HOST ||
            'smtp.gmail.com';
        const mailPort = Number(process.env.MAIL_PORT ||
            process.env.SMTP_PORT ||
            process.env.SNTP_PORT) || 587;
        const isGmail = mailHost.includes('gmail.com');
        try {
            this.transporter = nodemailer.createTransport({
                host: mailHost,
                port: mailPort,
                secure: mailPort === 465,
                auth: { user: mailUser, pass: mailPass },
                ...(isGmail && {
                    service: 'gmail',
                    tls: { rejectUnauthorized: false },
                }),
            });
            this.logger.log('MailService: transporter created lazily from env.');
            return this.transporter;
        }
        catch (err) {
            this.logger.error('ensureTransporter: createTransport hatası:', err?.message || err);
            this.transporter = null;
            return null;
        }
    }
    async sendPasswordResetMail(to, resetUrl) {
        const explicitlyDev = process.env.MAIL_MODE?.toLowerCase() === 'dev';
        if (explicitlyDev) {
            this.logger.log(`[DEV] Mail atlandı (MAIL_MODE=dev). to=${to}`);
            return;
        }
        const transport = this.transporter || this.ensureTransporter();
        if (!transport) {
            this.logger.error('Mail transporter yok. SMTP_USER ve SMTP_PASS (veya MAIL_USER/MAIL_PASS) Vercel env’de tanımlı mı? Production ortamı seçili mi? Redeploy yaptın mı?');
            throw new Error('Mail transporter not configured. Set SMTP_USER and SMTP_PASS in environment.');
        }
        const mailFromName = process.env.MAIL_FROM_NAME || 'feellink';
        const mailFrom = process.env.MAIL_FROM || 'info@feellink.io';
        const from = `"${mailFromName}" <${mailFrom}>`;
        const subject = 'Feellink | Şifre Sıfırlama Bağlantınız';
        const text = `Şifrenizi sıfırlamak için aşağıdaki bağlantıyı kullanabilirsiniz:\n\n${resetUrl}\n\nBu bağlantı 15 dakika geçerlidir. Eğer bu işlemi siz başlatmadıysanız, bu e-postayı güvenle yok sayabilirsiniz.\n\n© Feellink – Sanat Daha Anlamlı`;
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
                    Şifre Sıfırlama Talebi
                  </h1>
                </td>
              </tr>

              <!-- Açıklama -->
              <tr>
                <td style="padding-top:18px;">
                  <p style="margin:0;font-size:15px;color:#444;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
                    Merhaba,
                    <br><br>
                    Feellink hesabınız için bir şifre sıfırlama talebi aldık.
                    Yeni şifrenizi belirlemek için aşağıdaki turuncu butona tıklayın.
                  </p>
                </td>
              </tr>

              <!-- BUTON -->
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
                    Bu bağlantı 15 dakika geçerlidir. Eğer bu işlemi siz başlatmadıysanız, bu e-postayı güvenle yok sayabilirsiniz.
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
            this.logger.log(`Sending password reset email to ${to}...`);
            const result = await transport.sendMail({
                from,
                to,
                subject,
                text,
                html,
            });
            this.logger.log(`✅ Password reset email sent to ${to}`);
            this.logger.debug(`Mail sent with messageId: ${result.messageId}`);
            return result;
        }
        catch (error) {
            this.logger.error(`❌ Failed to send password reset email to ${to}:`, error.message || error);
            if (error.code === 'EAUTH') {
                this.logger.error('SMTP kimlik doğrulama hatası! Lütfen SMTP_USER ve SMTP_PASS değerlerini kontrol edin.');
                this.logger.error('Gmail kullanıyorsanız:');
                this.logger.error('1. Google hesabınızda 2FA açık olmalı');
                this.logger.error('2. App Password oluşturmalısınız (https://myaccount.google.com/apppasswords)');
                this.logger.error('3. SMTP_PASS değeri App Password olmalı (normal şifre değil)');
            }
            throw error;
        }
    }
    async sendSignupOtpMail(to, code) {
        const explicitlyDev = process.env.MAIL_MODE?.toLowerCase() === 'dev';
        if (explicitlyDev) {
            this.logger.log(`[DEV] Signup OTP mail atlandı (MAIL_MODE=dev). to=${to}, code=${code}`);
            return;
        }
        const transport = this.transporter || this.ensureTransporter();
        if (!transport) {
            this.logger.warn('Mail transporter not configured. Skipping signup OTP email.');
            return;
        }
        const mailFromName = process.env.MAIL_FROM_NAME || 'Feellink';
        const mailFrom = process.env.MAIL_FROM || 'noreply@feellink.io';
        const from = `"${mailFromName}" <${mailFrom}>`;
        const subject = 'Feellink – E-posta doğrulama kodunuz';
        const text = `Doğrulama Kodunuz: ${code}\n\nBu kod 10 dakika boyunca geçerlidir.\nBu isteği siz yapmadıysanız bu e-postayı dikkate almayın.\n\n© Feellink`;
        const html = `
      <!DOCTYPE html>
      <html lang="tr">
      <body style="margin:0;padding:0;background:#0f0f0f;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#0f0f0f;padding:40px 16px;">
        <tr><td align="center">
          <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#1a1a1a;border-radius:16px;overflow:hidden;border:1px solid #2a2a2a;">
            <tr><td align="center" style="padding:32px 24px 24px;">
              <img src="${this.logoUrl}" width="88" height="32" alt="Feellink" style="display:block;outline:none;border:0;" />
            </td></tr>
            <tr><td align="center" style="padding:0 32px 16px;">
              <h1 style="margin:0;font-size:20px;font-weight:600;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Doğrulama Kodunuz</h1>
            </td></tr>
            <tr><td align="center" style="padding:8px 32px 24px;">
              <p style="margin:0;font-size:32px;font-weight:700;letter-spacing:8px;color:#ff7b00;font-family:monospace;">${code}</p>
            </td></tr>
            <tr><td style="padding:0 32px 24px;">
              <p style="margin:0;font-size:14px;line-height:1.5;color:#a0a0a0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Bu kod 10 dakika boyunca geçerlidir.</p>
              <p style="margin:12px 0 0;font-size:13px;color:#666;">Bu isteği siz yapmadıysanız bu e-postayı dikkate almayın.</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
      </body>
      </html>`;
        try {
            await transport.sendMail({ from, to, subject, text, html });
            this.logger.log(`✅ Signup OTP email sent to ${to}`);
        }
        catch (error) {
            this.logger.error(`Failed to send signup OTP to ${to}:`, error?.message || error);
            throw error;
        }
    }
    async sendPasswordResetOtpMail(to, code) {
        const explicitlyDev = process.env.MAIL_MODE?.toLowerCase() === 'dev';
        if (explicitlyDev) {
            this.logger.log(`[DEV] Password reset OTP mail atlandı (MAIL_MODE=dev). to=${to}, code=${code}`);
            return;
        }
        const transport = this.transporter || this.ensureTransporter();
        if (!transport) {
            this.logger.warn('Mail transporter not configured. Skipping password reset OTP email.');
            return;
        }
        const mailFromName = process.env.MAIL_FROM_NAME || 'Feellink';
        const mailFrom = process.env.MAIL_FROM || 'noreply@feellink.io';
        const from = `"${mailFromName}" <${mailFrom}>`;
        const subject = 'Feellink – Şifre sıfırlama doğrulama kodunuz';
        const text = `Şifre sıfırlama doğrulama kodunuz: ${code}\n\nBu kod 10 dakika boyunca geçerlidir.\nBu isteği siz yapmadıysanız bu e-postayı dikkate almayın.\n\n© Feellink`;
        const html = `
      <!DOCTYPE html>
      <html lang="tr">
      <body style="margin:0;padding:0;background:#0f0f0f;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#0f0f0f;padding:40px 16px;">
        <tr><td align="center">
          <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#1a1a1a;border-radius:16px;overflow:hidden;border:1px solid #2a2a2a;">
            <tr><td align="center" style="padding:32px 24px 24px;">
              <img src="${this.logoUrl}" width="88" height="32" alt="Feellink" style="display:block;outline:none;border:0;" />
            </td></tr>
            <tr><td align="center" style="padding:0 32px 16px;">
              <h1 style="margin:0;font-size:20px;font-weight:600;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Şifre Sıfırlama Doğrulama Kodunuz</h1>
            </td></tr>
            <tr><td align="center" style="padding:8px 32px 24px;">
              <p style="margin:0;font-size:32px;font-weight:700;letter-spacing:8px;color:#ff7b00;font-family:monospace;">${code}</p>
            </td></tr>
            <tr><td style="padding:0 32px 24px;">
              <p style="margin:0;font-size:14px;line-height:1.5;color:#a0a0a0;">Bu kod 10 dakika boyunca geçerlidir.</p>
              <p style="margin:12px 0 0;font-size:13px;color:#666;">Bu isteği siz yapmadıysanız bu e-postayı dikkate almayın.</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
      </body>
      </html>`;
        try {
            await transport.sendMail({ from, to, subject, text, html });
            this.logger.log(`✅ Password reset OTP email sent to ${to}`);
        }
        catch (error) {
            this.logger.error(`Failed to send password reset OTP to ${to}:`, error?.message || error);
            throw error;
        }
    }
    async sendWelcomeEmail(user) {
        const explicitlyDev = process.env.MAIL_MODE?.toLowerCase() === 'dev';
        if (explicitlyDev) {
            this.logger.log(`[DEV] Hoş geldin maili atlandı (MAIL_MODE=dev). Alıcı: ${user.email}`);
            return;
        }
        const transport = this.transporter || this.ensureTransporter();
        if (!transport) {
            this.logger.warn('Mail transporter not configured. Skipping welcome email.');
            return;
        }
        const mailFromName = process.env.MAIL_FROM_NAME || 'Feellink';
        const mailFrom = process.env.MAIL_FROM || 'noreply@feellink.io';
        const from = `"${mailFromName}" <${mailFrom}>`;
        const appUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'https://feellink.io';
        const exploreUrl = `${appUrl}/explore`;
        const name = user.fullName?.trim() || user.username || 'Üye';
        const subject = "Feellink'e hoş geldin ✨";
        const text = `Merhaba ${name},\n\nFeellink'e katıldığın için çok mutluyuz. Hesabın başarıyla oluşturuldu ve artık topluluğun bir parçasısın.\n\n` +
            `Burada ilham veren paylaşımları keşfedebilir, kendi üretimlerini paylaşabilir ve etkileşim kurabilirsin.\n\n` +
            `Başlamak için: ${exploreUrl}\n\nSevgiyle,\nFeellink Ekibi`;
        const html = `
<!DOCTYPE html>
<html lang="tr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f0f;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#0f0f0f;padding:40px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#1a1a1a;border-radius:16px;overflow:hidden;border:1px solid #2a2a2a;">
        <tr>
          <td align="center" style="padding:32px 24px 24px;">
            <img src="${this.logoUrl}" width="88" height="32" alt="Feellink" style="display:block;outline:none;border:0;" />
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 24px;">
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Merhaba ${name},</h1>
            <p style="margin:0 0 20px;font-size:16px;line-height:1.5;color:#a0a0a0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Feellink'e katıldığın için çok mutluyuz. Hesabın başarıyla oluşturuldu ve artık topluluğun bir parçasısın.</p>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#b0b0b0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Burada ilham veren paylaşımları keşfedebilir, kendi üretimlerini paylaşabilir ve etkileşim kurabilirsin. Keşfetmeye başla, profilini düzenle ve ilk paylaşımını oluştur.</p>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 auto;">
              <tr>
                <td style="border-radius:10px;background:#ff7b00;">
                  <a href="${exploreUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Feellink'i Keşfet</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px 32px;border-top:1px solid #2a2a2a;">
            <p style="margin:0;font-size:12px;color:#666;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Bu e-posta, Feellink hesabın oluşturulduğu için gönderildi.</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
        try {
            await transport.sendMail({
                from,
                to: user.email,
                subject,
                text,
                html,
            });
            this.logger.log(`✅ Hoş geldin e-postası gönderildi: ${user.email}`);
        }
        catch (error) {
            this.logger.warn(`Hoş geldin e-postası gönderilemedi (${user.email}):`, error?.message || error);
        }
    }
    async sendEvent24HourReminder(params) {
        const mailMode = process.env.MAIL_MODE || 'dev';
        if (!this.isProductionMailMode()) {
            this.logger.log(`[DEV] 24h reminder mail gönderimi atlandı (MAIL_MODE=${mailMode})`);
            this.logger.log(`[DEV] 24h reminder for ${params.to}: ${params.eventTitle}`);
            return;
        }
        if (!this.transporter) {
            this.logger.warn('Mail transporter not configured. Skipping email send.');
            return;
        }
        const mailFromName = process.env.MAIL_FROM_NAME || 'feellink';
        const mailFrom = process.env.MAIL_FROM || 'info@feellink.io';
        const from = `"${mailFromName}" <${mailFrom}>`;
        const subject = 'Yarın Etkinliğiniz Var | Feellink';
        const eventDateFormatted = params.eventDate.toLocaleString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
        const eventDateOnly = params.eventDate.toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
        const eventTime = params.eventDate.toLocaleTimeString('tr-TR', {
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
                    Yarın Etkinliğiniz Var
                  </h1>
                </td>
              </tr>

              <!-- Açıklama -->
              <tr>
                <td style="padding-top:18px;">
                  <p style="margin:0;font-size:15px;color:#444;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
                    Merhaba ${params.name || ''},
                    <br><br>
                    Katılımınız onaylanan <strong>"${params.eventTitle}"</strong> etkinliği yarın gerçekleşecektir.
                  </p>
                </td>
              </tr>

              <!-- Etkinlik Bilgileri -->
              <tr>
                <td style="padding-top:20px;">
                  <div style="background:#f8f9fa;border-radius:8px;padding:16px;border-left:4px solid #F28C28;">
                    <p style="margin:0 0 8px 0;font-size:14px;color:#666;font-family:Arial,Helvetica,sans-serif;">
                      <strong style="color:#222;">📍 Tarih:</strong> ${eventDateOnly}
                    </p>
                    <p style="margin:0 0 8px 0;font-size:14px;color:#666;font-family:Arial,Helvetica,sans-serif;">
                      <strong style="color:#222;">⏰ Saat:</strong> ${eventTime}
                    </p>
                    ${params.location ? `
                    <p style="margin:0;font-size:14px;color:#666;font-family:Arial,Helvetica,sans-serif;">
                      <strong style="color:#222;">📌 Konum:</strong> ${params.location}
                    </p>
                    ` : ''}
                  </div>
                </td>
              </tr>

              <!-- CTA Button -->
              <tr>
                <td align="center" style="padding:30px 0 10px 0;">
                  <a href="${params.eventUrl}" style="
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
                    Etkinliği Görüntüle
                  </a>
                </td>
              </tr>

              <!-- Not -->
              <tr>
                <td style="padding-top:20px;">
                  <p style="margin:0;font-size:13px;color:#777;line-height:1.5;font-family:Arial,Helvetica,sans-serif;">
                    Sorularınız için bizimle her zaman iletişime geçebilirsiniz.
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
                    Keyifli bir etkinlik dileriz,
                    <br>
                    Feellink Ekibi
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
        const text = `Merhaba ${params.name || ''},

Katılımınız onaylanan "${params.eventTitle}" etkinliği yarın gerçekleşecektir.

📍 Tarih: ${eventDateOnly}
⏰ Saat: ${eventTime}
${params.location ? `📌 Konum: ${params.location}\n` : ''}

Etkinlik detaylarını görüntülemek için aşağıdaki bağlantıyı kullanabilirsiniz:

${params.eventUrl}

Sorularınız için bizimle her zaman iletişime geçebilirsiniz.

Keyifli bir etkinlik dileriz,
Feellink Ekibi`;
        try {
            await this.transporter.sendMail({
                from,
                to: params.to,
                subject,
                text,
                html,
            });
            this.logger.log(`✅ 24h reminder email sent to ${params.to} for event: ${params.eventTitle}`);
        }
        catch (error) {
            this.logger.error(`❌ Failed to send 24h reminder email to ${params.to}:`, error);
            throw error;
        }
    }
    async sendEventReminder(params) {
        if (!this.transporter) {
            this.logger.warn('Mail transporter not configured. Skipping email send.');
            return;
        }
        const mailFromName = process.env.MAIL_FROM_NAME || 'feellink';
        const mailFrom = process.env.MAIL_FROM || 'info@feellink.io';
        const from = `"${mailFromName}" <${mailFrom}>`;
        const subject = `Etkinlik hatırlatma: ${params.eventTitle} (30 dk kaldı)`;
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
        }
        catch (error) {
            this.logger.error(`Failed to send event reminder email to ${params.to}:`, error);
            throw error;
        }
    }
    async sendApplicationApprovedMail(params) {
        if (!this.transporter) {
            this.logger.warn('Mail transporter not configured. Skipping email send.');
            return;
        }
        const mailFromName = process.env.MAIL_FROM_NAME || 'feellink';
        const mailFrom = process.env.MAIL_FROM || 'info@feellink.io';
        const from = `"${mailFromName}" <${mailFrom}>`;
        const subject = 'Feellink | Başvurunuz Hakkında';
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
                    Başvurunuz Hakkında
                  </h1>
                </td>
              </tr>

              <!-- Açıklama -->
              <tr>
                <td style="padding-top:18px;">
                  <p style="margin:0;font-size:15px;color:#444;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
                    Merhaba ${params.name || ''},
                    <br><br>
                    <strong>${params.listingTitle}</strong> ilanına yaptığınız başvuru olumlu değerlendirilmiştir.
                    <br><br>
                    İlan sahibi sizinle Feellink üzerinden mesajlaşma yoluyla iletişime geçebilir.
                    <br>
                    Dilerseniz siz de <strong>Mesajlar</strong> bölümünden görüşmeyi başlatabilirsiniz.
                  </p>
                </td>
              </tr>

              ${params.companyName ? `
              <!-- Şirket Bilgisi -->
              <tr>
                <td style="padding-top:20px;">
                  <div style="background:#f8f9fa;border-radius:8px;padding:16px;border-left:4px solid #F28C28;">
                    <p style="margin:0;font-size:14px;color:#666;font-family:Arial,Helvetica,sans-serif;">
                      <strong style="color:#222;">Şirket:</strong> ${params.companyName}
                    </p>
                  </div>
                </td>
              </tr>
              ` : ''}

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
            this.logger.log(`Application approved email sent to ${params.to} for listing: ${params.listingTitle}`);
        }
        catch (error) {
            this.logger.error(`Failed to send application approved email to ${params.to}:`, error);
            throw error;
        }
    }
    async sendApplicationRejectedMail(params) {
        if (!this.transporter) {
            this.logger.warn('Mail transporter not configured. Skipping email send.');
            return;
        }
        const mailFromName = process.env.MAIL_FROM_NAME || 'feellink';
        const mailFrom = process.env.MAIL_FROM || 'info@feellink.io';
        const from = `"${mailFromName}" <${mailFrom}>`;
        const subject = 'Feellink | Başvurunuz Hakkında';
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
                    Başvurunuz Hakkında
                  </h1>
                </td>
              </tr>

              <!-- Açıklama -->
              <tr>
                <td style="padding-top:18px;">
                  <p style="margin:0;font-size:15px;color:#444;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
                    Merhaba ${params.name || ''},
                    <br><br>
                    <strong>${params.listingTitle}</strong> ilanına gösterdiğiniz ilgi için teşekkür ederiz.
                    <br><br>
                    Başvurunuz değerlendirilmiş olup, bu pozisyon için sürece farklı adaylarla devam edilmektedir.
                    <br>
                    İlerleyen dönemlerde uygun fırsatlarda tekrar iletişime geçmekten memnuniyet duyarız.
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
            this.logger.log(`Application rejected email sent to ${params.to} for listing: ${params.listingTitle}`);
        }
        catch (error) {
            this.logger.error(`Failed to send application rejected email to ${params.to}:`, error);
            throw error;
        }
    }
    async sendReportResolvedEmail(params) {
        if (!this.transporter) {
            this.logger.warn('Mail transporter not configured. Skipping email send.');
            return;
        }
        const mailFromName = process.env.MAIL_FROM_NAME || 'feellink';
        const mailFrom = process.env.MAIL_FROM || 'info@feellink.io';
        const from = `"${mailFromName}" <${mailFrom}>`;
        const subject = 'Feellink | Bildiriminiz İncelendi';
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
                    Bildiriminiz İncelendi
                  </h1>
                </td>
              </tr>

              <!-- Açıklama -->
              <tr>
                <td style="padding-top:18px;">
                  <p style="margin:0;font-size:15px;color:#444;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
                    Merhaba ${params.userName || ''},
                    <br><br>
                    Feellink topluluğunun güvenliğini sağlamak adına ilettiğiniz bildirimi inceledik.
                    <br><br>
                    Yapılan değerlendirme sonucunda gerekli incelemeler tamamlanmış ve durum çözüme kavuşturulmuştur.
                    <br><br>
                    Gizlilik politikamız gereği, alınan aksiyonun detayları hakkında bilgi paylaşamıyoruz.
                    Ancak bildiriminizin sistemimizde dikkate alındığını ve gerekli işlemlerin yapıldığını bilmenizi isteriz.
                    <br><br>
                    Feellink'i daha güvenli ve sağlıklı bir ortam haline getirmemize katkı sağladığınız için teşekkür ederiz.
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
                    Saygılarımızla,<br>
                    Feellink Destek Ekibi
                    <br><br>
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
        const text = `Merhaba ${params.userName || ''},

Feellink topluluğunun güvenliğini sağlamak adına ilettiğiniz bildirimi inceledik.

Yapılan değerlendirme sonucunda gerekli incelemeler tamamlanmış ve durum çözüme kavuşturulmuştur.

Gizlilik politikamız gereği, alınan aksiyonun detayları hakkında bilgi paylaşamıyoruz. Ancak bildiriminizin sistemimizde dikkate alındığını ve gerekli işlemlerin yapıldığını bilmenizi isteriz.

Feellink'i daha güvenli ve sağlıklı bir ortam haline getirmemize katkı sağladığınız için teşekkür ederiz.

Saygılarımızla,
Feellink Destek Ekibi`;
        try {
            await this.transporter.sendMail({
                from,
                to: params.to,
                subject,
                text,
                html,
            });
            this.logger.log(`Report resolved email sent to ${params.to} for user: ${params.userName}`);
        }
        catch (error) {
            this.logger.warn(`Failed to send report resolved email to ${params.to}:`, error);
        }
    }
    async sendEmailChangeConfirmation(params) {
        if (!this.transporter) {
            this.logger.warn('Mail transporter not configured. Skipping email send.');
            return;
        }
        const mailFromName = process.env.MAIL_FROM_NAME || 'feellink';
        const mailFrom = process.env.MAIL_FROM || 'info@feellink.io';
        const from = `"${mailFromName}" <${mailFrom}>`;
        const subject = 'Feellink | E-posta Adresini Onayla';
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
                    E-posta Adresini Onayla
                  </h1>
                </td>
              </tr>

              <!-- Açıklama -->
              <tr>
                <td style="padding-top:18px;">
                  <p style="margin:0;font-size:15px;color:#444;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
                    Merhaba ${params.userName || ''},
                    <br><br>
                    E-posta adresini değiştirmek için aşağıdaki bağlantıya tıklayın.
                    <br><br>
                    Bu bağlantı 24 saat geçerlidir.
                  </p>
                </td>
              </tr>

              <!-- BUTON -->
              <tr>
                <td align="center" style="padding:30px 0 10px 0;">
                  <a href="${params.confirmUrl}" style="
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
                    E-posta Adresini Onayla
                  </a>
                </td>
              </tr>

              <!-- Not -->
              <tr>
                <td style="padding-top:20px;">
                  <p style="margin:0;font-size:13px;color:#777;line-height:1.5;font-family:Arial,Helvetica,sans-serif;">
                    Eğer bu işlemi siz başlatmadıysanız, bu e-postayı güvenle yok sayabilirsiniz.
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
        const text = `Merhaba ${params.userName || ''},

E-posta adresini değiştirmek için aşağıdaki bağlantıya tıklayın:

${params.confirmUrl}

Bu bağlantı 24 saat geçerlidir.

Eğer bu işlemi siz başlatmadıysanız, bu e-postayı güvenle yok sayabilirsiniz.

Feellink – Sanat daha anlamlı.`;
        try {
            await this.transporter.sendMail({
                from,
                to: params.to,
                subject,
                text,
                html,
            });
            this.logger.log(`Email change confirmation sent to ${params.to}`);
        }
        catch (error) {
            this.logger.error(`Failed to send email change confirmation to ${params.to}:`, error);
            throw error;
        }
    }
    async sendEmailChangeNotification(params) {
        if (!this.transporter) {
            this.logger.warn('Mail transporter not configured. Skipping email send.');
            return;
        }
        const mailFromName = process.env.MAIL_FROM_NAME || 'feellink';
        const mailFrom = process.env.MAIL_FROM || 'info@feellink.io';
        const from = `"${mailFromName}" <${mailFrom}>`;
        const subject = 'Feellink | Hesap Güvenliği Bildirimi';
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
                    Hesap Güvenliği Bildirimi
                  </h1>
                </td>
              </tr>

              <!-- Açıklama -->
              <tr>
                <td style="padding-top:18px;">
                  <p style="margin:0;font-size:15px;color:#444;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
                    Merhaba ${params.userName || ''},
                    <br><br>
                    Hesabınızda e-posta değişikliği talep edilmiştir.
                    <br><br>
                    Yeni e-posta adresi: <strong>${params.newEmail}</strong>
                    <br><br>
                    Bu işlem size ait değilse lütfen bizimle iletişime geçin.
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
        const text = `Merhaba ${params.userName || ''},

Hesabınızda e-posta değişikliği talep edilmiştir.

Yeni e-posta adresi: ${params.newEmail}

Bu işlem size ait değilse lütfen bizimle iletişime geçin.

Feellink – Sanat daha anlamlı.`;
        try {
            await this.transporter.sendMail({
                from,
                to: params.to,
                subject,
                text,
                html,
            });
            this.logger.log(`Email change notification sent to ${params.to}`);
        }
        catch (error) {
            this.logger.error(`Failed to send email change notification to ${params.to}:`, error);
        }
    }
    async sendRoleChangedMail(params) {
        if (!this.transporter) {
            this.logger.warn('Mail transporter not configured. Skipping email send.');
            return;
        }
        const mailFromName = process.env.MAIL_FROM_NAME || 'feellink';
        const mailFrom = process.env.MAIL_FROM || 'info@feellink.io';
        const from = `"${mailFromName}" <${mailFrom}>`;
        const subject = 'Feellink | Hesap Rolünüz Güncellendi';
        const roleLabels = {
            art_lover: 'Sanat Sever',
            corporate: 'Kurumsal',
            collector: 'Koleksiyoner',
            artist: 'Sanatçı',
        };
        const oldRoleList = (params.oldRoles || [])
            .map(role => roleLabels[role] || role)
            .join(', ') || 'Yok';
        const newRoleList = params.newRoles
            .map(role => roleLabels[role] || role)
            .join(', ');
        const nextChangeDateStr = params.nextChangeDate
            ? params.nextChangeDate.toLocaleDateString('tr-TR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            })
            : '';
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
                    Hesap Rolünüz Güncellendi
                  </h1>
                </td>
              </tr>

              <!-- Açıklama -->
              <tr>
                <td style="padding-top:18px;">
                  <p style="margin:0;font-size:15px;color:#444;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
                    Merhaba ${params.name || ''},
                    <br><br>
                    Feellink hesabınızdaki roller yönetici tarafından güncellenmiştir.
                    <br><br>
                    ${params.oldRoles && params.oldRoles.length > 0 ? `<strong>Önceki Rol${params.oldRoles.length > 1 ? 'ler' : ''}:</strong> ${oldRoleList}<br><br>` : ''}
                    <strong>Yeni Rol${params.newRoles.length > 1 ? 'ler' : ''}:</strong> ${newRoleList}
                  </p>
                </td>
              </tr>

              <!-- Bilgi Notu -->
              <tr>
                <td style="padding-top:20px;">
                  <div style="background:#f8f9fa;border-radius:8px;padding:16px;border-left:4px solid #F28C28;">
                    <p style="margin:0;font-size:14px;color:#666;line-height:1.5;font-family:Arial,Helvetica,sans-serif;">
                      <strong>Bilgilendirme:</strong><br>
                      Rolleriniz güvenlik ve sistem bütünlüğü nedeniyle ayda en fazla bir kez değiştirilebilir.
                      ${nextChangeDateStr ? `<br><br>Bir sonraki rol değişikliği <strong>${nextChangeDateStr}</strong> tarihinde mümkündür.` : ''}
                      <br><br>
                      Bu değişiklik hakkında bilginiz yoksa bizimle iletişime geçebilirsiniz.
                    </p>
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
                    Feellink Ekibi
                    <br><br>
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
        const text = `Merhaba ${params.name || ''},

Feellink hesabınızdaki roller yönetici tarafından güncellenmiştir.

${params.oldRoles && params.oldRoles.length > 0 ? `Önceki Rol${params.oldRoles.length > 1 ? 'ler' : ''}: ${oldRoleList}\n\n` : ''}Yeni Rol${params.newRoles.length > 1 ? 'ler' : ''}: ${newRoleList}

Bilgilendirme:
Rolleriniz güvenlik ve sistem bütünlüğü nedeniyle ayda en fazla bir kez değiştirilebilir.
${nextChangeDateStr ? `Bir sonraki rol değişikliği ${nextChangeDateStr} tarihinde mümkündür.\n\n` : '\n'}
Bu değişiklik hakkında bilginiz yoksa bizimle iletişime geçebilirsiniz.

Feellink Ekibi
Feellink – Sanat daha anlamlı.`;
        try {
            await this.transporter.sendMail({
                from,
                to: params.to,
                subject,
                text,
                html,
            });
            this.logger.log(`Role changed email sent to ${params.to} for roles: ${params.newRoles.join(', ')}`);
        }
        catch (error) {
            this.logger.warn(`Failed to send role changed email to ${params.to}:`, error);
        }
    }
    async sendPasswordChangedMail(params) {
        this.logger.log(`📧 [PASSWORD CHANGE MAIL] Starting mail send to: ${params.to}`);
        const mailMode = process.env.MAIL_MODE || 'dev';
        this.logger.log(`📧 [PASSWORD CHANGE MAIL] MAIL_MODE=${mailMode}`);
        if (!this.isProductionMailMode()) {
            this.logger.warn(`⚠️ [PASSWORD CHANGE MAIL] Mail gönderimi atlandı (MAIL_MODE=${mailMode} - production için 'prod' veya 'production' olmalı)`);
            this.logger.warn(`⚠️ [PASSWORD CHANGE MAIL] Dev mode: Mail would be sent to ${params.to}`);
            this.logger.warn(`⚠️ [PASSWORD CHANGE MAIL] To enable mail sending, set MAIL_MODE=prod or MAIL_MODE=production in .env`);
            return;
        }
        if (!this.transporter) {
            this.logger.error(`❌ [PASSWORD CHANGE MAIL] CRITICAL: Mail transporter not configured!`);
            this.logger.error(`❌ [PASSWORD CHANGE MAIL] Check MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS in .env`);
            return;
        }
        this.logger.log(`📧 [PASSWORD CHANGE MAIL] Transporter configured, proceeding with mail send`);
        const mailFromName = process.env.MAIL_FROM_NAME || 'feellink';
        const mailFrom = process.env.MAIL_FROM || 'info@feellink.io';
        const from = `"${mailFromName}" <${mailFrom}>`;
        const subject = 'Şifreniz Değiştirildi | Feellink Güvenlik Bildirimi';
        const supportEmail = process.env.SUPPORT_EMAIL || 'destek@feellink.io';
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
                    Şifreniz Başarıyla Güncellendi
                  </h1>
                </td>
              </tr>

              <!-- Açıklama -->
              <tr>
                <td style="padding-top:18px;">
                  <p style="margin:0;font-size:15px;color:#444;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
                    Merhaba ${params.name || ''},
                    <br><br>
                    Feellink hesabınızın şifresi <strong>${params.dateTime}</strong> tarihinde başarıyla güncellendi.
                    <br><br>
                    Eğer bu işlemi siz yaptıysanız, herhangi bir şey yapmanıza gerek yoktur.
                  </p>
                </td>
              </tr>

              <!-- Güvenlik Uyarısı -->
              <tr>
                <td style="padding-top:20px;">
                  <div style="background:#fff3cd;border-radius:8px;padding:16px;border-left:4px solid #ffc107;">
                    <p style="margin:0 0 8px 0;font-size:14px;color:#856404;font-weight:600;font-family:Arial,Helvetica,sans-serif;">
                      ⚠️ Eğer bu işlemi siz yapmadıysanız:
                    </p>
                    <ul style="margin:0;padding-left:20px;font-size:14px;color:#856404;line-height:1.8;font-family:Arial,Helvetica,sans-serif;">
                      <li>Hesabınıza giriş yapmayı deneyin ve şifrenizi hemen değiştirin</li>
                      <li>Mümkünse hesabınızdan çıkış yapıp yeniden giriş yapın</li>
                      <li>Destek ekibimizle iletişime geçin: <a href="mailto:${supportEmail}" style="color:#856404;text-decoration:underline;">${supportEmail}</a></li>
                    </ul>
                  </div>
                </td>
              </tr>

              ${params.device || params.location || params.ipMasked ? `
              <!-- İşlem Bilgileri -->
              <tr>
                <td style="padding-top:20px;">
                  <div style="background:#f8f9fa;border-radius:8px;padding:16px;border-left:4px solid #F28C28;">
                    <p style="margin:0 0 8px 0;font-size:13px;color:#666;font-weight:600;font-family:Arial,Helvetica,sans-serif;">
                      İşlem Bilgileri:
                    </p>
                    ${params.device ? `
                    <p style="margin:0 0 4px 0;font-size:13px;color:#666;font-family:Arial,Helvetica,sans-serif;">
                      <strong>Cihaz / Tarayıcı:</strong> ${params.device}
                    </p>
                    ` : ''}
                    ${params.location ? `
                    <p style="margin:0 0 4px 0;font-size:13px;color:#666;font-family:Arial,Helvetica,sans-serif;">
                      <strong>Yaklaşık konum:</strong> ${params.location}
                    </p>
                    ` : ''}
                    ${params.ipMasked ? `
                    <p style="margin:0;font-size:13px;color:#666;font-family:Arial,Helvetica,sans-serif;">
                      <strong>IP:</strong> ${params.ipMasked}
                    </p>
                    ` : ''}
                  </div>
                </td>
              </tr>
              ` : ''}

              <!-- Footer -->
              <tr>
                <td style="padding-top:24px;">
                  <hr style="border:none;border-top:1px solid #eaeaea;">
                </td>
              </tr>

              <tr>
                <td align="center" style="padding-top:12px;">
                  <p style="margin:0;font-size:12px;color:#999;font-family:Arial,Helvetica,sans-serif;line-height:1.5;">
                    <strong>Güvenliğiniz bizim için önemlidir.</strong>
                    <br>
                    <strong>Feellink</strong> – Sanat daha anlamlı.
                    <br>
                    Feellink Ekibi
                    <br><br>
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
        const text = `Merhaba ${params.name || ''},

Feellink hesabınızın şifresi ${params.dateTime} tarihinde başarıyla güncellendi.

Eğer bu işlemi siz yaptıysanız, herhangi bir şey yapmanıza gerek yoktur.

Eğer bu işlemi siz yapmadıysanız:
- Hesabınıza giriş yapmayı deneyin ve şifrenizi hemen değiştirin
- Mümkünse hesabınızdan çıkış yapıp yeniden giriş yapın
- Destek ekibimizle iletişime geçin: ${supportEmail}

${params.device || params.location || params.ipMasked ? `İşlem bilgileri:
${params.device ? `Cihaz / Tarayıcı: ${params.device}\n` : ''}${params.location ? `Yaklaşık konum: ${params.location}\n` : ''}${params.ipMasked ? `IP: ${params.ipMasked}\n` : ''}` : ''}

Güvenliğiniz bizim için önemlidir.
Feellink Ekibi`;
        try {
            this.logger.log(`📧 [PASSWORD CHANGE MAIL] Sending mail to: ${params.to}`);
            this.logger.log(`📧 [PASSWORD CHANGE MAIL] From: ${from}`);
            this.logger.log(`📧 [PASSWORD CHANGE MAIL] Subject: ${subject}`);
            const mailResult = await this.transporter.sendMail({
                from,
                to: params.to,
                subject,
                text,
                html,
            });
            this.logger.log(`✅ [PASSWORD CHANGE MAIL] Mail sent successfully to: ${params.to}`);
            this.logger.log(`✅ [PASSWORD CHANGE MAIL] MessageId: ${mailResult.messageId || 'N/A'}`);
            this.logger.log(`✅ [PASSWORD CHANGE MAIL] Response: ${mailResult.response || 'N/A'}`);
        }
        catch (error) {
            this.logger.error(`❌ [PASSWORD CHANGE MAIL] CRITICAL: Failed to send password changed email to ${params.to}`);
            this.logger.error(`❌ [PASSWORD CHANGE MAIL] Error message: ${error?.message || String(error)}`);
            this.logger.error(`❌ [PASSWORD CHANGE MAIL] Error code: ${error?.code || 'N/A'}`);
            this.logger.error(`❌ [PASSWORD CHANGE MAIL] Error stack:`, error?.stack);
        }
    }
};
exports.MailService = MailService;
exports.MailService = MailService = MailService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], MailService);
//# sourceMappingURL=mail.service.js.map