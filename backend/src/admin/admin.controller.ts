import { Controller, Post, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private prisma: PrismaService) {}

  /**
   * 🔍 Tüm kullanıcıların takipçi ve takip edilen sayısını kontrol edip düzeltir
   * Follow tablosundaki tüm kayıtlar zaten ACCEPTED durumunda olduğu için status kontrolü yok
   */
  @Post('recalculate-follows')
  async recalculateFollows() {
    const users = await this.prisma.user.findMany({ 
      select: { id: true } 
    });

    let fixed = 0;
    const updates = [];

    // Tüm kullanıcılar için sayıları hesapla
    for (const user of users) {
      const [followers, following] = await Promise.all([
        // Bu kullanıcıyı takip edenler (followeeId = user.id)
        this.prisma.follow.count({
          where: { followingId: user.id },
        }),
        // Bu kullanıcının takip ettikleri (followerId = user.id)
        this.prisma.follow.count({
          where: { followerId: user.id },
        }),
      ]);

      updates.push(
        this.prisma.user.update({
          where: { id: user.id },
          data: {
            followerCount: followers,
            followingCount: following,
          },
        })
      );

      fixed++;
    }

    // Tüm güncellemeleri paralel olarak yap
    await Promise.all(updates);

    return {
      message: '✅ Tüm kullanıcıların takipçi/following sayıları kontrol edildi ve güncellendi.',
      totalUsers: users.length,
      updated: fixed,
      timestamp: new Date().toISOString(),
    };
  }
}



