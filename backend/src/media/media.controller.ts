import { Controller, Post, Get, UseGuards, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, Query, Param, Res, NotFoundException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller()
export class MediaController {
  constructor(private mediaService: MediaService) {}

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



