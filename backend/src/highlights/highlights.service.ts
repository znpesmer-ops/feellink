import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHighlightDto } from './dto/create-highlight.dto';

@Injectable()
export class HighlightsService {
  private readonly logger = new Logger(HighlightsService.name);
  
  constructor(private prisma: PrismaService) {}

  async getByUsername(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.logger.log(`🔍 Fetching highlights for username: ${username}, userId: ${user.id}`);
    
    return this.getByUserId(user.id);
  }

  async getByUserId(userId: string) {
    this.logger.log(`🔍 Fetching highlights for userId: ${userId}`);
    
    // User'ın var olduğunu kontrol et
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Plan kontrolü kaldırıldı - artık herkes highlights görebilir

    const highlights = await this.prisma.highlight.findMany({
      where: { userId: userId },
      include: {
        coverPost: {
          include: {
            media: {
              orderBy: { order: 'asc' },
              take: 1,
            },
          },
        },
        items: {
          include: {
            post: {
              include: {
                media: {
                  orderBy: { order: 'asc' },
                  take: 1,
                },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    this.logger.log(`📦 Found ${highlights.length} highlights for userId: ${userId}`);
    if (highlights.length > 0) {
      this.logger.log(`📦 Highlight IDs: [${highlights.map(h => h.id).join(', ')}]`);
      this.logger.log(`📦 Highlight userIds: [${highlights.map(h => h.userId).join(', ')}]`);
      // 🔥 KRİTİK: userId eşleşmesini kontrol et
      const wrongUserIds = highlights.filter(h => h.userId !== userId)
      if (wrongUserIds.length > 0) {
        this.logger.warn(`⚠️ WARNING: Found ${wrongUserIds.length} highlights with wrong userId! Expected: ${userId}, Got: [${wrongUserIds.map(h => h.userId).join(', ')}]`);
      }
    } else {
      this.logger.warn(`⚠️ No highlights found for userId: ${userId}. Checking database...`);
      // Database'de gerçekten highlight var mı kontrol et
      const allHighlights = await this.prisma.highlight.findMany({
        where: {},
        select: { id: true, userId: true, title: true },
        take: 10,
      });
      this.logger.log(`📦 Total highlights in database: ${allHighlights.length}`);
      if (allHighlights.length > 0) {
        this.logger.log(`📦 Sample highlights: [${allHighlights.map(h => `id=${h.id}, userId=${h.userId}, title=${h.title}`).join('; ')}]`);
      }
    }

    // Media URL'lerini düzelt
    return highlights.map((highlight) => ({
      ...highlight,
      coverPost: highlight.coverPost
        ? {
            ...highlight.coverPost,
            imageUrl: highlight.coverPost.media[0]?.url || null,
          }
        : null,
      items: highlight.items.map((item) => ({
        ...item,
        post: {
          id: item.post.id,
          title: item.post.title || null,
          caption: item.post.caption || null,
          imageUrl: item.post.media[0]?.url || null,
        },
      })),
    }));
  }

  async create(dto: CreateHighlightDto, userId: string) {
    // 🔥 KRİTİK: ZORUNLU VALIDASYONLAR (Kullanıcının istediği gibi)
    if (!dto.postIds || dto.postIds.length === 0) {
      this.logger.error('❌ CRITICAL: postIds is empty or undefined!');
      throw new BadRequestException('Tema için en az 1 eser seçilmelidir');
    }

    if (!dto.coverPostId) {
      this.logger.error('❌ CRITICAL: coverPostId is missing!');
      throw new BadRequestException('Kapak eseri zorunludur');
    }

    // 🔥 KRİTİK: userId kontrolü
    if (!userId || userId === 'undefined' || userId === 'null') {
      this.logger.error(`❌ CRITICAL: Invalid userId! userId: ${userId}, type: ${typeof userId}`);
      throw new BadRequestException('Geçersiz kullanıcı kimliği');
    }
    
    // 🔥 KRİTİK: Tema adı kontrolü
    if (!dto.title || !dto.title.trim()) {
      throw new BadRequestException('Tema adı zorunludur');
    }
    
    this.logger.log(`🔍 Creating highlight - All validations passed: userId=${userId}, title=${dto.title}, coverPostId=${dto.coverPostId}, postIds.length=${dto.postIds.length}`);

    // Plan kontrolü kaldırıldı - artık herkes highlight oluşturabilir
    // Kullanıcının var olduğunu kontrol et
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new ForbiddenException('Kullanıcı bulunamadı.');
    }

    // ÖNE ÇIKAN TEMALAR: Sadece kullanıcının KENDİ post'larını eklemesine izin ver
    // ❌ Başkalarının eserleri YOK
    // ❌ Genel arama YOK
    // ❌ Koleksiyon mantığı YOK
    // ✅ Sadece kullanıcının kendi yüklediği post'lar
    const posts = await this.prisma.post.findMany({
      where: {
        id: { in: dto.postIds },
        userId, // Sadece kullanıcının kendi post'ları
      },
      select: { id: true },
    });

    if (posts.length !== dto.postIds.length) {
      throw new BadRequestException('Tüm gönderiler size ait olmalıdır.');
    }

    if (posts.length === 0) {
      throw new BadRequestException('En az bir gönderi seçmelisiniz.');
    }

    // Cover post kontrolü - coverPostId zorunlu ve postIds içinde olmalı
    const coverPostId = dto.coverPostId;
    if (!dto.postIds.includes(coverPostId)) {
      throw new BadRequestException('Kapak görseli seçilen eserler arasında olmalıdır.');
    }

    // Cover post'un kullanıcıya ait olduğunu kontrol et
    const coverPost = await this.prisma.post.findUnique({
      where: { id: coverPostId },
      select: { userId: true },
    });

    if (!coverPost) {
      throw new BadRequestException('Kapak eseri bulunamadı');
    }

    if (coverPost.userId !== userId) {
      throw new ForbiddenException('Sadece kendi eserlerinizi kapak olarak kullanabilirsiniz');
    }

    this.logger.log(`Creating highlight for user ${userId} with title: ${dto.title}, coverPostId: ${coverPostId}, postIds: ${dto.postIds.join(', ')}`);
    this.logger.log(`📦 PostIds array length: ${dto.postIds.length}, postIds: [${dto.postIds.join(', ')}]`);
    this.logger.log(`🔍 Database write - userId: ${userId}, userId type: ${typeof userId}, userId valid: ${!!userId && userId !== 'undefined' && userId !== 'null'}`);

    // 🔥 KRİTİK: Transaction ile tema ve eser ilişkilerini birlikte kaydet
    // 🔥 KRİTİK: userId'nin kesinlikle geçerli olduğundan emin ol
    // 🔥 KRİTİK: Try/catch içinde MUTLAKA throw yap (Kullanıcının istediği gibi)
    let createdHighlight;
    try {
      createdHighlight = await this.prisma.highlight.create({
        data: {
          title: dto.title,
          userId: userId, // 🔴 BURASI NULL/UNDEFINED OLMAMALI
          coverPostId,
          items: {
            create: dto.postIds.map((postId, index) => {
              this.logger.log(`  → Creating HighlightItem ${index + 1}/${dto.postIds.length}: postId=${postId}, sortOrder=${index}`);
              return {
                postId,
                sortOrder: index,
              };
            }),
          },
        },
      include: {
        coverPost: {
          include: {
            media: {
              orderBy: { order: 'asc' },
              take: 1,
            },
          },
        },
        items: {
          include: {
            post: {
              include: {
                media: {
                  orderBy: { order: 'asc' },
                  take: 1,
                },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      });
      
      this.logger.log(`✅ Prisma create SUCCESS - Highlight ID: ${createdHighlight.id}`);
    } catch (error: any) {
      // 🔥 KRİTİK: Hata oluşursa MUTLAKA throw et (Kullanıcının istediği gibi)
      this.logger.error(`❌ CRITICAL: Prisma create FAILED! Error:`, error);
      this.logger.error(`❌ Error details:`, {
        message: error?.message,
        code: error?.code,
        meta: error?.meta,
        postIds: dto.postIds,
        coverPostId: coverPostId,
        userId: userId,
      });
      throw error; // ❗ MUTLAKA THROW - Frontend'e hata dön
    }

    this.logger.log(`✅ Highlight created successfully with ID: ${createdHighlight.id} for user ${userId}`);
    this.logger.log(`🔍 Database verification - Created highlight userId: ${createdHighlight.userId}, matches input: ${createdHighlight.userId === userId}`);
    
    // 🔥 KRİTİK: Database'e yazıldığını doğrula
    if (!createdHighlight.userId || createdHighlight.userId !== userId) {
      this.logger.error(`❌ CRITICAL: Highlight created with WRONG userId! Expected: ${userId}, Got: ${createdHighlight.userId}`);
      throw new Error('Tema oluşturulurken bir hata oluştu');
    }

    // 🔥 KRİTİK: getByUsername ile aynı formatta döndür (frontend'in beklediği format)
    const formattedHighlight = {
      ...createdHighlight,
      coverPost: createdHighlight.coverPost
        ? {
            ...createdHighlight.coverPost,
            imageUrl: createdHighlight.coverPost.media[0]?.url || null,
          }
        : null,
      items: createdHighlight.items.map((item) => ({
        ...item,
        post: {
          id: item.post.id,
          title: item.post.title || null,
          caption: item.post.caption || null,
          imageUrl: item.post.media[0]?.url || null,
        },
      })),
    };

    this.logger.log(`📦 Formatted highlight returned:`, {
      id: formattedHighlight.id,
      title: formattedHighlight.title,
      userId: formattedHighlight.userId,
      hasCoverPost: !!formattedHighlight.coverPost,
      coverPostImageUrl: formattedHighlight.coverPost?.imageUrl || null,
      itemsCount: formattedHighlight.items.length,
      items: formattedHighlight.items.map((item, idx) => ({
        index: idx,
        itemId: item.id,
        postId: item.post.id,
        postTitle: item.post.title,
        hasImageUrl: !!item.post.imageUrl,
      })),
    });
    
    // 🔥 KRİTİK: Eğer items boşsa uyarı ver
    if (formattedHighlight.items.length === 0) {
      this.logger.warn(`⚠️ WARNING: Highlight created with NO ITEMS! ID: ${formattedHighlight.id}, postIds sent: [${dto.postIds.join(', ')}]`);
    }
    
    // 🔥 KRİTİK: Database'den tekrar oku ve doğrula (Instagram mantığı - kesinlik için)
    const verifiedHighlight = await this.prisma.highlight.findUnique({
      where: { id: formattedHighlight.id },
      include: {
        coverPost: {
          include: {
            media: {
              orderBy: { order: 'asc' },
              take: 1,
            },
          },
        },
        items: {
          include: {
            post: {
              include: {
                media: {
                  orderBy: { order: 'asc' },
                  take: 1,
                },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    
    if (!verifiedHighlight) {
      this.logger.error(`❌ CRITICAL: Highlight not found in database after creation! ID: ${formattedHighlight.id}`);
      throw new Error('Tema oluşturuldu ama database\'de bulunamadı');
    }
    
    this.logger.log(`✅ Verified highlight in database: ID=${verifiedHighlight.id}, userId=${verifiedHighlight.userId}, itemsCount=${verifiedHighlight.items.length}`);
    
    // Verified highlight'ı formatla ve döndür
    const finalHighlight = {
      ...verifiedHighlight,
      coverPost: verifiedHighlight.coverPost
        ? {
            ...verifiedHighlight.coverPost,
            imageUrl: verifiedHighlight.coverPost.media[0]?.url || null,
          }
        : null,
      items: verifiedHighlight.items.map((item) => ({
        ...item,
        post: {
          id: item.post.id,
          title: item.post.title || null,
          caption: item.post.caption || null,
          imageUrl: item.post.media[0]?.url || null,
        },
      })),
    };

    return finalHighlight;
  }

  async updateTitle(highlightId: string, title: string, userId: string) {
    // Highlight'ın kullanıcıya ait olduğunu kontrol et
    const highlight = await this.prisma.highlight.findUnique({
      where: { id: highlightId },
      select: { userId: true },
    });

    if (!highlight) {
      throw new NotFoundException('Highlight not found');
    }

    if (highlight.userId !== userId) {
      throw new ForbiddenException('Bu temayı düzenleme yetkiniz yok.');
    }

    return this.prisma.highlight.update({
      where: { id: highlightId },
      data: { title },
      include: {
        coverPost: {
          include: {
            media: {
              orderBy: { order: 'asc' },
              take: 1,
            },
          },
        },
        items: {
          include: {
            post: {
              include: {
                media: {
                  orderBy: { order: 'asc' },
                  take: 1,
                },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  async addPosts(highlightId: string, postIds: string[], userId: string) {
    // Highlight'ın kullanıcıya ait olduğunu kontrol et
    const highlight = await this.prisma.highlight.findUnique({
      where: { id: highlightId },
      select: { userId: true },
    });

    if (!highlight) {
      throw new NotFoundException('Highlight not found');
    }

    if (highlight.userId !== userId) {
      throw new ForbiddenException('Bu temaya eser ekleme yetkiniz yok.');
    }

    // ÖNE ÇIKAN TEMALAR: Sadece kullanıcının KENDİ post'larını eklemesine izin ver
    // ❌ Başkalarının eserleri YOK
    // ❌ Genel arama YOK
    // ❌ Koleksiyon mantığı YOK
    // ✅ Sadece kullanıcının kendi yüklediği post'lar
    const posts = await this.prisma.post.findMany({
      where: {
        id: { in: postIds },
        userId, // Sadece kullanıcının kendi post'ları
      },
      select: { id: true },
    });

    if (posts.length !== postIds.length) {
      throw new BadRequestException('Tüm gönderiler size ait olmalıdır.');
    }

    if (posts.length === 0) {
      throw new BadRequestException('En az bir gönderi seçmelisiniz.');
    }

    // Mevcut item'ları kontrol et (duplicate önleme)
    const existingItems = await this.prisma.highlightItem.findMany({
      where: {
        highlightId,
        postId: { in: postIds },
      },
      select: { postId: true },
    });

    const existingPostIds = existingItems.map((item) => item.postId);
    const newPostIds = postIds.filter((id) => !existingPostIds.includes(id));

    if (newPostIds.length === 0) {
      throw new BadRequestException('Seçilen eserler zaten temada mevcut.');
    }

    // Mevcut item sayısını al (sortOrder için)
    const currentItemCount = await this.prisma.highlightItem.count({
      where: { highlightId },
    });

    // Yeni item'ları ekle
    await this.prisma.highlightItem.createMany({
      data: newPostIds.map((postId, index) => ({
        highlightId,
        postId,
        sortOrder: currentItemCount + index,
      })),
    });

    return this.prisma.highlight.findUnique({
      where: { id: highlightId },
      include: {
        coverPost: {
          include: {
            media: {
              orderBy: { order: 'asc' },
              take: 1,
            },
          },
        },
        items: {
          include: {
            post: {
              include: {
                media: {
                  orderBy: { order: 'asc' },
                  take: 1,
                },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  async removePosts(highlightId: string, postIds: string[], userId: string) {
    // Highlight'ın kullanıcıya ait olduğunu kontrol et
    const highlight = await this.prisma.highlight.findUnique({
      where: { id: highlightId },
      select: { userId: true },
    });

    if (!highlight) {
      throw new NotFoundException('Highlight not found');
    }

    if (highlight.userId !== userId) {
      throw new ForbiddenException('Bu temadan eser kaldırma yetkiniz yok.');
    }

    if (postIds.length === 0) {
      throw new BadRequestException('En az bir eser seçmelisiniz.');
    }

    // Mevcut item'ları kontrol et
    const existingItems = await this.prisma.highlightItem.findMany({
      where: {
        highlightId,
        postId: { in: postIds },
      },
      select: { id: true, postId: true },
    });

    if (existingItems.length === 0) {
      throw new BadRequestException('Seçilen eserler temada bulunamadı.');
    }

    // Item'ları sil
    const itemIdsToDelete = existingItems.map((item) => item.id);
    await this.prisma.highlightItem.deleteMany({
      where: {
        id: { in: itemIdsToDelete },
      },
    });

    // Eğer silinen eserlerden biri coverPost ise, coverPost'u güncelle
    const deletedPostIds = existingItems.map((item) => item.postId);
    const highlightWithCover = await this.prisma.highlight.findUnique({
      where: { id: highlightId },
      select: { coverPostId: true },
    });

    if (highlightWithCover?.coverPostId && deletedPostIds.includes(highlightWithCover.coverPostId)) {
      // Cover post silindi, yeni bir cover seç
      const remainingItems = await this.prisma.highlightItem.findFirst({
        where: { highlightId },
        orderBy: { sortOrder: 'asc' },
        select: { postId: true },
      });

      await this.prisma.highlight.update({
        where: { id: highlightId },
        data: {
          coverPostId: remainingItems?.postId || null,
        },
      });
    }

    return this.prisma.highlight.findUnique({
      where: { id: highlightId },
      include: {
        coverPost: {
          include: {
            media: {
              orderBy: { order: 'asc' },
              take: 1,
            },
          },
        },
        items: {
          include: {
            post: {
              include: {
                media: {
                  orderBy: { order: 'asc' },
                  take: 1,
                },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  async delete(highlightId: string, userId: string) {
    // Highlight'ın kullanıcıya ait olduğunu kontrol et
    const highlight = await this.prisma.highlight.findUnique({
      where: { id: highlightId },
      select: { userId: true },
    });

    if (!highlight) {
      throw new NotFoundException('Highlight not found');
    }

    if (highlight.userId !== userId) {
      throw new ForbiddenException('Bu temayı silme yetkiniz yok.');
    }

    // Prisma cascade delete ile HighlightItem'lar otomatik silinir
    // Post'lar silinmez (sadece bağlantı kopar)
    await this.prisma.highlight.delete({
      where: { id: highlightId },
    });

    return { success: true };
  }
}

