import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { randomBytes } from 'crypto';

@Injectable()
export class EmailChangeService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async requestEmailChange(userId: string, newEmail: string) {
    // Kullanıcıyı bul
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Aynı e-posta girilirse işlem yapma
    if (user.email.toLowerCase() === newEmail.toLowerCase()) {
      throw new BadRequestException('Yeni e-posta adresi mevcut e-posta ile aynı olamaz.');
    }

    // Yeni e-posta zaten kullanılıyor mu kontrol et
    const existingUser = await this.prisma.user.findUnique({
      where: { email: newEmail.toLowerCase() },
    });

    if (existingUser) {
      throw new BadRequestException('Bu e-posta adresi zaten kullanılıyor.');
    }

    // Eski istekleri iptal et
    await this.prisma.emailChangeRequest.deleteMany({
      where: { userId },
    });

    // Token oluştur
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 saat geçerli

    // İstek kaydı oluştur
    await this.prisma.emailChangeRequest.create({
      data: {
        userId,
        newEmail: newEmail.toLowerCase(),
        token,
        expiresAt,
      },
    });

    // Yeni e-postaya doğrulama maili gönder
    try {
      const confirmUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/email-change/confirm?token=${token}`;
      await this.mailService.sendEmailChangeConfirmation({
        to: newEmail,
        userName: user.fullName || user.username,
        confirmUrl,
      });
    } catch (error) {
      console.error('Failed to send email change confirmation:', error);
      // Mail gönderilemezse de devam et, kullanıcıya hata verme
    }

    // Eski e-postaya bilgilendirme maili gönder
    try {
      await this.mailService.sendEmailChangeNotification({
        to: user.email,
        userName: user.fullName || user.username,
        newEmail: newEmail.toLowerCase(),
      });
    } catch (error) {
      console.error('Failed to send email change notification:', error);
      // Mail gönderilemezse de devam et
    }

    return {
      message: 'E-posta değişiklik talebi oluşturuldu. Yeni e-posta adresinize gönderilen bağlantıya tıklayarak değişikliği onaylayın.',
    };
  }

  async confirmEmailChange(token: string) {
    // İsteği bul
    const request = await this.prisma.emailChangeRequest.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!request) {
      throw new NotFoundException('Geçersiz veya süresi dolmuş bağlantı.');
    }

    // Token süresi dolmuş mu kontrol et
    if (new Date() > request.expiresAt) {
      await this.prisma.emailChangeRequest.delete({
        where: { id: request.id },
      });
      throw new BadRequestException('Bu bağlantının süresi dolmuş. Lütfen yeni bir e-posta değişiklik talebi oluşturun.');
    }

    // Yeni e-posta hala kullanılabilir mi kontrol et
    const existingUser = await this.prisma.user.findUnique({
      where: { email: request.newEmail },
    });

    if (existingUser) {
      await this.prisma.emailChangeRequest.delete({
        where: { id: request.id },
      });
      throw new BadRequestException('Bu e-posta adresi artık kullanılıyor.');
    }

    // E-posta değiştir
    await this.prisma.user.update({
      where: { id: request.userId },
      data: {
        email: request.newEmail,
      },
    });

    // İsteği sil
    await this.prisma.emailChangeRequest.delete({
      where: { id: request.id },
    });

    return {
      message: 'E-posta adresiniz başarıyla değiştirildi.',
    };
  }

  async getPendingEmailChange(userId: string) {
    const request = await this.prisma.emailChangeRequest.findFirst({
      where: {
        userId,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return request
      ? {
          newEmail: request.newEmail,
          expiresAt: request.expiresAt,
        }
      : null;
  }

  async resendConfirmationEmail(userId: string) {
    const request = await this.prisma.emailChangeRequest.findFirst({
      where: {
        userId,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: { user: true },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!request) {
      throw new NotFoundException('Aktif e-posta değişiklik talebi bulunamadı.');
    }

    // Yeni e-postaya doğrulama maili gönder
    try {
      const confirmUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/email-change/confirm?token=${request.token}`;
      await this.mailService.sendEmailChangeConfirmation({
        to: request.newEmail,
        userName: request.user.fullName || request.user.username,
        confirmUrl,
      });
    } catch (error) {
      console.error('Failed to resend email change confirmation:', error);
      throw new BadRequestException('E-posta gönderilemedi. Lütfen daha sonra tekrar deneyin.');
    }

    return {
      message: 'Doğrulama e-postası yeniden gönderildi.',
    };
  }
}

