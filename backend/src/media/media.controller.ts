import { BadRequestException, Body, Controller, Post, Get, UseGuards, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, Query, Param, Res, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { randomUUID } from 'crypto';
import { generateClientTokenFromReadWriteToken } from '@vercel/blob/client';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

const CLIENT_UPLOAD_TOKEN_TIMEOUT_MS = 10000;
const MAX_CLIENT_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeout) {
      clearTimeout(timeout);
    }
  });
}

@Controller()
export class MediaController {
  constructor(private mediaService: MediaService) {}

  @Post('media/client-upload-token')
  @UseGuards(JwtAuthGuard)
  async createClientUploadToken(
    @CurrentUser() user: any,
    @Body() body: { fileName?: string; contentType?: string; size?: number; folder?: string },
  ) {
    const startedAt = Date.now();
    const contentType = typeof body?.contentType === 'string' ? body.contentType : '';
    const fileName = typeof body?.fileName === 'string' ? body.fileName : 'artwork.jpg';
    const size = Number(body?.size || 0);
    const folder = body?.folder === 'files' ? 'files' : 'posts';
    const allowedMediaTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
      'image/gif',
      'video/mp4',
      'video/webm',
      'video/quicktime',
    ];
    const maximumSizeInBytes = MAX_CLIENT_UPLOAD_SIZE_BYTES;

    console.log('🔐 [MediaController] client-upload-token START', {
      userId: user?.id,
      contentType,
      sizeMb: Number.isFinite(size) ? (size / 1024 / 1024).toFixed(2) : 'invalid',
      folder,
    });

    if (!user?.id) {
      throw new BadRequestException('Kullanıcı kimliği bulunamadı');
    }

    if (!allowedMediaTypes.includes(contentType)) {
      throw new BadRequestException('Bu dosya türü desteklenmiyor. Lütfen JPEG, PNG, WebP, AVIF, GIF, MP4 veya WebM yükleyin.');
    }

    if (!Number.isFinite(size) || size <= 0 || size > maximumSizeInBytes) {
      throw new BadRequestException('Dosya çok büyük. Lütfen 50MB altında bir dosya yükleyin.');
    }

    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!blobToken) {
      console.error('❌ [MediaController] BLOB_READ_WRITE_TOKEN missing for client upload token');
      throw new InternalServerErrorException('Yükleme servisi şu an hazır değil. Lütfen kısa süre sonra tekrar deneyin.');
    }

    const safeName = fileName
      .normalize('NFKD')
      .replace(/[^\w.\-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 120) || 'artwork.jpg';
    const pathname = `${folder}/${user.id}/${Date.now()}-${randomUUID()}-${safeName}`;

    try {
      const clientToken = await withTimeout(
        generateClientTokenFromReadWriteToken({
          token: blobToken,
          pathname,
          allowedContentTypes: allowedMediaTypes,
          maximumSizeInBytes,
          addRandomSuffix: false,
          cacheControlMaxAge: 31536000,
          validUntil: Date.now() + 10 * 60 * 1000,
        }),
        CLIENT_UPLOAD_TOKEN_TIMEOUT_MS,
        'Yükleme izni oluşturma zaman aşımına uğradı.',
      );

      console.log('✅ [MediaController] client-upload-token READY', {
        userId: user.id,
        ms: Date.now() - startedAt,
        pathname,
      });

      return { clientToken, pathname };
    } catch (error: any) {
      console.error('❌ [MediaController] client-upload-token FAILED', {
        userId: user.id,
        ms: Date.now() - startedAt,
        message: error?.message,
      });
      throw new InternalServerErrorException('Yükleme izni oluşturulamadı. Lütfen tekrar deneyin.');
    }
  }

  // ⚠️ MinIO endpoint'leri kaldırıldı - Vercel Blob kullanıyoruz
  // Vercel Blob URL'leri zaten public ve CDN'li
  // File serving için bu endpoint'e gerek yok

  @Post('media/upload')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }), // 50MB (dosyalar için daha büyük)
          // Dosya tipi kontrolü kaldırıldı - her türlü dosya kabul edilir
        ],
      }),
    )
    file: Express.Multer.File,
    @Query('type') type?: string, // 'image' veya 'file'
  ) {
    if (!file) {
      throw new Error('File is required');
    }

    // Klasör belirleme: resimler için 'posts', dosyalar için 'files', portfolyo için 'portfolios', CV için 'cvs'
    let folder = 'posts';
    if (type === 'file') {
      folder = 'files';
    } else if (type === 'portfolio') {
      folder = 'portfolios';
    } else if (type === 'cv') {
      folder = 'cvs';
    }
    const result = await this.mediaService.uploadFile(file, folder);
    
    return {
      url: result.url,
      imageUrl: result.url, // Geriye uyumluluk için
      path: result.url, // Geriye uyumluluk için
      fileName: result.fileName,
      fileType: result.fileType,
    };
  }
}
