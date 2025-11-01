import { Controller, Post, UseGuards, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('media')
@UseGuards(JwtAuthGuard)
export class MediaController {
  constructor(private mediaService: MediaService) {}

  @Post('upload')
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

    // Klasör belirleme: resimler için 'posts', dosyalar için 'files'
    const folder = type === 'file' ? 'files' : 'posts';
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



