import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { getPrismaInstance } from '../../prisma/prisma.service';

@Injectable()
export class AccountStatusGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const request = context.switchToHttp().getRequest();
      const user = request.user;

      // ✅ Auth guard'dan geçmemişse veya user yoksa, bu guard devreye girmesin
      // ⚠️ ÖNEMLİ: Bu guard APP_GUARD olarak çalışıyor, JWT guard'dan önce çalışabilir
      // Bu yüzden user yoksa geç (JWT guard zaten kontrol edecek)
      if (!user || !user.id) {
        return true; // Auth guard zaten kontrol ediyor veya public route
      }

      try {
        const prisma = getPrismaInstance();

        // ✅ Kullanıcıyı veritabanından çek (güncel accountStatus için)
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            accountStatus: true,
            suspendedUntil: true,
            suspensionReason: true,
          },
        });

        if (!dbUser) {
          return true; // Kullanıcı bulunamadı, auth guard zaten kontrol ediyor
        }

        // ✅ Eğer suspendedUntil geçmişse, otomatik olarak ACTIVE'ye çek
        if (
          dbUser.accountStatus === 'SUSPENDED' &&
          dbUser.suspendedUntil &&
          new Date(dbUser.suspendedUntil) < new Date()
        ) {
          try {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                accountStatus: 'ACTIVE',
                suspendedAt: null,
                suspendedUntil: null,
                suspensionReason: null,
                suspensionNote: null,
                suspendedByAdminId: null,
              },
            });
          } catch (updateError) {
            // Update başarısız olursa sessizce devam et
            console.warn('AccountStatusGuard: Failed to update user status:', updateError);
          }
          return true; // Artık aktif, devam et
        }

        // ✅ Eğer hesap askıya alınmışsa ve süre dolmamışsa
        if (dbUser.accountStatus === 'SUSPENDED') {
          const method = request.method;
          // ✅ Sadece WRITE işlemlerini engelle (POST, PUT, PATCH, DELETE)
          if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
            throw new ForbiddenException({
              code: 'ACCOUNT_SUSPENDED',
              message: 'Hesabınız geçici olarak askıya alınmıştır.',
              reason: dbUser.suspensionReason || 'Belirtilmemiş',
              until: dbUser.suspendedUntil || null,
            });
          }
        }
      } catch (dbError) {
        // Database hatası durumunda sessizce geç (guard çalışmaya devam etsin)
        console.warn('AccountStatusGuard: Database error, allowing request:', dbError);
        return true;
      }

      return true;
    } catch (error) {
      // Herhangi bir hata durumunda sessizce geç
      console.warn('AccountStatusGuard: Error, allowing request:', error);
      return true;
    }
  }
}
