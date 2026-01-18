import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as MinIO from 'minio';
import { randomUUID } from 'crypto';
import { put } from '@vercel/blob';

@Injectable()
export class MediaService {
  private readonly isDisabled: boolean;
  private minioClient: MinIO.Client | null = null;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    // ⛔️ SERVERLESS / PRODUCTION KESİN KAPALI
    const isServerless = process.env.VERCEL === '1';
    const isProd = process.env.NODE_ENV === 'production';

    this.isDisabled =
      isServerless ||
      isProd ||
      this.configService.get('MINIO_DISABLED') === 'true';

    this.bucketName =
      this.configService.get('MINIO_BUCKET_NAME') ?? 'feellink-dev';

    if (this.isDisabled) {
      console.warn('[MediaService] MinIO DISABLED (serverless-safe)');
      this.minioClient = null;
      return;
    }

    // ⛔️ Constructor'da ASLA async işlem yok
    // ⛔️ ensureBucket() ASLA çağrılmaz (serverless'ta yasak)
    try {
      const minioPort = this.configService.get('MINIO_PORT');
      const port = minioPort ? parseInt(minioPort, 10) : 9000;

      this.minioClient = new MinIO.Client({
        endPoint: this.configService.get('MINIO_ENDPOINT') || 'localhost',
        port: isNaN(port) ? 9000 : port,
        useSSL: this.configService.get('MINIO_USE_SSL') === 'true',
        accessKey: this.configService.get('MINIO_ACCESS_KEY') || '',
        secretKey: this.configService.get('MINIO_SECRET_KEY') || '',
      });
    } catch (error: any) {
      // Constructor'da hata olursa sessizce devam et
      console.warn('[MediaService] MinIO initialization failed:', error?.message || error);
      this.minioClient = null;
      this.isDisabled = true;
    }
  }

  // ❌ ensureBucket() TAMAMEN KALDIRILDI
  // Bucket deployment sırasında veya CI/CD'de hazırlanır
  // Runtime'da ASLA çağrılmaz (serverless'ta yasak)

  async uploadFile(file: Express.Multer.File, folder: string = 'posts'): Promise<{ url: string; fileName: string; fileType: string }> {
    const fileName = `${folder}/${randomUUID()}-${file.originalname}`;

    // ✅ Vercel serverless'ta Vercel Blob Storage kullan
    if (this.isDisabled || !this.minioClient) {
      const blobToken = this.configService.get('BLOB_READ_WRITE_TOKEN');
      
      if (!blobToken) {
        // ❌ BLOB_READ_WRITE_TOKEN eksik - açık hata mesajı ver
        console.error('[MediaService] ❌ BLOB_READ_WRITE_TOKEN environment variable tanımlı değil!');
        throw new Error('Dosya yükleme servisi yapılandırılmamış. Lütfen sistem yöneticisiyle iletişime geçin.');
      }
      
      // ✅ Vercel Blob Storage'a upload
      try {
        const blob = await put(fileName, file.buffer, {
          access: 'public',
          contentType: file.mimetype,
          token: blobToken,
        });
        
        return {
          url: blob.url, // ✅ Absolute public URL (örn: https://xxx.public.blob.vercel-storage.com/...)
          fileName: file.originalname,
          fileType: file.mimetype,
        };
      } catch (error: any) {
        console.error('[MediaService] ❌ Vercel Blob upload failed:', error?.message || error);
        throw new Error(`Dosya yüklenemedi: ${error?.message || 'Bilinmeyen hata'}`);
      }
    }

    await this.minioClient.putObject(
      this.bucketName,
      fileName,
      file.buffer,
      file.size,
      {
        'Content-Type': file.mimetype,
      },
    );

    // BASE_URL varsa onu kullan (mobil uyumluluk için)
    const baseUrl = this.configService.get('BASE_URL');
    if (baseUrl) {
      // BASE_URL formatı: http://192.168.1.38:3002
      // MinIO dosya yolu: /bucket-name/file-path
      return {
        url: `${baseUrl}/${this.bucketName}/${fileName}`,
        fileName: file.originalname,
        fileType: file.mimetype,
      };
    }

    // Fallback: Backend port (3002) kullan, MinIO port (9000) değil
    const backendPort = this.configService.get('PORT') || '3002';
    const endpoint = this.configService.get('MINIO_ENDPOINT') || 'localhost';
    const protocol = 'http';
    
    // localhost yerine IP kullan (mobil uyumluluk için)
    const resolvedEndpoint = endpoint === 'localhost' || endpoint === '127.0.0.1' 
      ? '192.168.1.38' 
      : endpoint;
    
    return {
      url: `${protocol}://${resolvedEndpoint}:${backendPort}/${this.bucketName}/${fileName}`,
      fileName: file.originalname,
      fileType: file.mimetype,
    };
  }

  async deleteFile(fileUrl: string): Promise<void> {
    if (this.isDisabled || !this.minioClient) {
      return;
    }

    try {
      const urlParts = fileUrl.split('/');
      const fileName = urlParts.slice(urlParts.indexOf(this.bucketName) + 1).join('/');
      await this.minioClient.removeObject(this.bucketName, fileName);
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  }

  getPublicUrl(fileName: string): string {
    if (this.isDisabled || !this.minioClient) {
      // BASE_URL varsa onu kullan, yoksa backend port (3002) kullan
      const base = this.configService.get('BASE_URL') || 
                   this.configService.get('APP_URL') || 
                   `http://192.168.1.38:${this.configService.get('PORT') || '3002'}`;
      return `${base}/static/${fileName}`;
    }

    // BASE_URL varsa onu kullan (mobil uyumluluk için)
    const baseUrl = this.configService.get('BASE_URL');
    if (baseUrl) {
      return `${baseUrl}/${this.bucketName}/${fileName}`;
    }

    // Fallback: Backend port (3002) kullan, MinIO port (9000) değil
    const backendPort = this.configService.get('PORT') || '3002';
    const endpoint = this.configService.get('MINIO_ENDPOINT') || 'localhost';
    const protocol = 'http';
    
    // localhost yerine IP kullan (mobil uyumluluk için)
    const resolvedEndpoint = endpoint === 'localhost' || endpoint === '127.0.0.1' 
      ? '192.168.1.38' 
      : endpoint;
    
    return `${protocol}://${resolvedEndpoint}:${backendPort}/${this.bucketName}/${fileName}`;
  }

  /**
   * MinIO'dan dosyayı getir (public erişim için)
   * @param filePath - Bucket içindeki dosya yolu (örn: posts/image.jpg)
   * @returns Stream veya null
   */
  async getFile(filePath: string): Promise<NodeJS.ReadableStream | null> {
    if (this.isDisabled || !this.minioClient) {
      return null;
    }

    try {
      // Bucket name'i path'ten çıkar (eğer varsa)
      let actualPath = filePath;
      if (filePath.startsWith(`${this.bucketName}/`)) {
        actualPath = filePath.replace(`${this.bucketName}/`, '');
      }

      const stream = await this.minioClient.getObject(this.bucketName, actualPath);
      return stream;
    } catch (error) {
      console.error('Error getting file from MinIO:', error);
      return null;
    }
  }

  /**
   * Dosyanın metadata'sını getir (Content-Type için)
   * @param filePath - Bucket içindeki dosya yolu
   * @returns Metadata veya null
   */
  async getFileMetadata(filePath: string): Promise<MinIO.BucketItemStat | null> {
    if (this.isDisabled || !this.minioClient) {
      return null;
    }

    try {
      // Bucket name'i path'ten çıkar (eğer varsa)
      let actualPath = filePath;
      if (filePath.startsWith(`${this.bucketName}/`)) {
        actualPath = filePath.replace(`${this.bucketName}/`, '');
      }

      const stat = await this.minioClient.statObject(this.bucketName, actualPath);
      return stat;
    } catch (error) {
      console.error('Error getting file metadata from MinIO:', error);
      return null;
    }
  }
}

