import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SidebarGateway } from './sidebar.gateway';

@Injectable()
export class SidebarService {
  constructor(
    private prisma: PrismaService,
    private gateway: SidebarGateway,
  ) {}

  async getGlobalData() {
    // 🔥 En Çok Görüntülenen Yazılar - veritabanından gerçek veri
    const topViewedArticles = await this.prisma.article.findMany({
      where: {
        isPublished: true,
      },
      orderBy: {
        views: 'desc',
      },
      take: 5,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            fullName: true,
            avatar: true,
          },
        },
      },
    });

    // Ayın Yazarları - en çok takipçisi olanlar
    const topWriters = await this.prisma.user.findMany({
      where: {
        isPrivate: false, // Sadece public hesaplar
      },
      orderBy: {
        followerCount: 'desc',
      },
      take: 2,
      select: {
        id: true,
        username: true,
        fullName: true,
        avatar: true,
        bio: true,
      },
    });

    // Ayın Müzeleri - sabit veri
    const museums = [
      { 
        id: 1, 
        name: 'İstanbul Modern', 
        image: '/museums/modern.jpg',
        color: 'from-[#f97316]/80 to-[#fbbf24]/60'
      },
      { 
        id: 2, 
        name: 'Pera Müzesi', 
        image: '/museums/pera.jpg',
        color: 'from-[#fb923c]/80 to-[#fed7aa]/60'
      },
      { 
        id: 3, 
        name: 'Odunpazarı Müzesi', 
        image: '/museums/odunpazari.jpg',
        color: 'from-[#fcd34d]/80 to-[#fde68a]/60'
      },
      { 
        id: 4, 
        name: 'Sabancı Müzesi', 
        image: '/museums/sabanci.jpg',
        color: 'from-[#f59e0b]/80 to-[#fcd34d]/60'
      },
    ];

    // Fallback: Eğer yeterli yazar yoksa sabit verileri kullan
    const authors = topWriters.length >= 2 
      ? topWriters.map((writer, index) => ({
          id: writer.id,
          slug: writer.username,
          name: writer.fullName || writer.username,
          avatar: writer.avatar || '/users/default.jpg',
          preview: index === 0 ? 'Duyguların izi her eserde saklıdır.' : 'Bellek, malzeme ve zamanın sessiz diyaloğu.',
          bio: writer.bio || 'Sanat ve yaratıcılık üzerine yazılar.',
          lastPost: {
            title: 'Son Yazı',
            preview: 'Son yazılarını keşfet...',
            link: `/writer/${writer.username}`,
          },
        }))
      : [
          {
            id: 'zeynep',
            slug: 'zeynep',
            name: 'Zeynep Esmer',
            avatar: '/users/zeynep.jpg',
            preview: 'Duyguların izi her eserde saklıdır.',
            bio: 'Çağdaş sanat pratiklerinde hafıza, duygu ve materyal ilişkisini araştıran bir sanatçı ve yazar. Feellink\'in kurucu üyelerindendir.',
            lastPost: {
              title: 'Duyguların Malzemesi: Hafıza ve Nesneler Arasında',
              preview: 'Nesneler yalnızca fiziksel değil, duygusal taşıyıcılardır. Her malzeme, geçmişten bugüne bir iz taşır. Bu yazı, sanatın duygusal hafızayı nasıl görünür kıldığını inceliyor...',
              link: '/writer/zeynep',
            },
          },
          {
            id: 'sude',
            slug: 'sude',
            name: 'Sude Esmer',
            avatar: '/users/sude.jpg',
            preview: 'Bellek, malzeme ve zamanın sessiz diyaloğu.',
            bio: 'Atık malzeme ve kültürel bellek temalı üretim yapan bir sanatçı. Yazılarında sürdürülebilirlik, çevre etiği ve toplumsal hafıza üzerine odaklanır.',
            lastPost: {
              title: 'Sessiz Dönüşüm: Atığın Estetiği',
              preview: 'Bir atığın güzelliğini görebilmek, yalnızca çevresel değil, etik bir farkındalıktır. Bu yazıda sanat ve atık arasındaki görünmez estetik diyaloğu keşfediyoruz...',
              link: '/writer/sude',
            },
          },
        ];

    return {
      museums,
      authors,
      topLikedArticles: topViewedArticles.map(article => ({
        id: article.id,
        title: article.title,
        coverImage: article.coverImage,
        totalLikes: article.views, // Görüntülenme sayısını göster (geçici)
        author: {
          id: article.author.id,
          username: article.author.username,
          fullName: article.author.fullName,
          avatar: article.author.avatar,
        },
      })),
    };
  }

  // Admin panelinden veya cron jobdan çağrılabilir
  async updateSidebarData() {
    const newData = await this.getGlobalData();
    this.gateway.broadcastSidebarUpdate(newData);
    return newData;
  }
}

