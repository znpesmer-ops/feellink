import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { put } from '@vercel/blob';

@Injectable()
export class MediaService {
  constructor(private configService: ConfigService) {
    console.log('📦 [MediaService] PRODUCTION MODE - SADECE Vercel Blob');
  }

  async uploadFile(file: Express.Multer.File, folder: string = 'posts'): Promise<{ url: string; fileName: string; fileType: string }> {
    const fileName = `${folder}/${randomUUID()}-${file.originalname}`;
    
    console.log(`📤 [MediaService] uploadFile START:`, {
      fileName,
      size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      mimetype: file.mimetype,
    });

    // ✅ 1. TOKEN KONTROLÜ
    const blobToken = this.configService.get('BLOB_READ_WRITE_TOKEN');
    if (!blobToken) {
      console.error('❌ [UPLOAD_ERROR] BLOB_READ_WRITE_TOKEN MISSING!');
      console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('BLOB')));
      throw new Error('BLOB_READ_WRITE_TOKEN eksik - Vercel backend env ayarlarını kontrol edin!');
    }

    // ✅ 2. VERCEL BLOB UPLOAD
    try {
      console.log(`☁️ [MediaService] Uploading to Vercel Blob...`);
      
      const blob = await put(fileName, file.buffer, {
        access: 'public',
        contentType: file.mimetype,
        token: blobToken,
      });

      // ✅ 3. URL KONTROLÜ
      if (!blob || !blob.url) {
        console.error('❌ [UPLOAD_ERROR] Blob upload returned NULL URL!');
        throw new Error('Vercel Blob upload başarısız - URL null!');
      }

      console.log(`✅ [MediaService] Upload SUCCESS:`, blob.url.substring(0, 60) + '...');
      
      return {
        url: blob.url,
        fileName: file.originalname,
        fileType: file.mimetype,
      };
    } catch (error: any) {
      console.error('❌ [UPLOAD_ERROR] Vercel Blob upload FAILED:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack?.split('\n')[0],
      });
      throw new Error(`Upload hatası: ${error?.message || 'Bilinmeyen hata'}`);
    }
  }

  async deleteFile(fileUrl: string): Promise<void> {
    // Vercel Blob deletion is handled by Vercel automatically (TTL based)
    console.log('[MediaService] Delete file request (Vercel Blob - no action needed):', fileUrl);
    return;
  }

  getPublicUrl(fileName: string): string {
    // Vercel Blob URLs are already absolute and public
    console.log('[MediaService] getPublicUrl - Vercel Blob URLs are absolute');
    return fileName; // Return as-is if it's already a full URL
  }
}
