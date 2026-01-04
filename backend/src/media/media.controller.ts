import { Controller, Post, Get, UseGuards, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, Query, Param, Res, NotFoundException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { File as MulterFile } from 'multer';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller()
export class MediaController {
  constructor(private mediaService: MediaService) {}

  // Public endpoint: MinIO bucket dosyalarını servis et
  // Bu endpoint authentication gerektirmez (görseller herkese açık)
  @Get('instagram-uploads/:path(*)')
  async getFile(
    @Param('path') path: string,
    @Res() res: Response,
  ) {
    try {
      const stream = await this.mediaService.getFile(path);
      
      if (!stream) {
        throw new NotFoundException('File not found');
      }

      // Content-Type'ı belirle
      const metadata = await this.mediaService.getFileMetadata(path);
      const contentType = metadata?.metaData?.['content-type'] || 
                         metadata?.metaData?.['Content-Type'] || 
                         'application/octet-stream';

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 yıl cache
      
      stream.pipe(res);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new NotFoundException('File not found');
    }
  }

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
    file: MulterFile,
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



