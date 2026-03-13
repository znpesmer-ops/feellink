import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Feellink Backend API',
    };
  }

  /** Mail env değişkenlerinin backend tarafında görünüp görünmediğini kontrol et (şifre/secret döndürülmez) */
  @Get('mail')
  mailStatus() {
    const mailMode = process.env.MAIL_MODE || '(not set)';
    const hasUser = !!(
      process.env.SMTP_USER ||
      process.env.SNTP_USER ||
      process.env.MAIL_USER
    );
    const hasPass = !!(
      process.env.SMTP_PASS ||
      process.env.SNTP_PASS ||
      process.env.MAIL_PASS
    );
    const smtpHost =
      process.env.SMTP_HOST ||
      process.env.SNTP_HOST ||
      process.env.MAIL_HOST ||
      '(default)';
    const resetLinkBase =
      process.env.FRONTEND_URL || process.env.APP_URL || '(not set)';
    const explicitlyDev = process.env.MAIL_MODE?.toLowerCase() === 'dev';
    const willSend =
      (hasUser && hasPass && !explicitlyDev) as boolean;
    return {
      mailMode,
      smtpConfigured: hasUser && hasPass,
      smtpHost,
      resetLinkBase,
      willActuallySendMails: willSend,
      envNamesNote:
        'SMTP_*, SNTP_* veya MAIL_* kullanılır. Reset link: FRONTEND_URL veya APP_URL.',
      hint: willSend
        ? 'Env görünüyor. Mail gitmiyorsa Vercel loglarında "SMTP bağlantısı başarılı" veya EAUTH/535 hata mesajını kontrol et.'
        : !hasUser || !hasPass
          ? 'SMTP_USER/SMTP_PASS (veya MAIL_*) backend projesinde tanımlı değil. İsimler SMTP_* olmalı (SNTP değil).'
          : 'MAIL_MODE=dev ise mail atılmaz. Kaldırın veya prod yapın.',
    };
  }
}









