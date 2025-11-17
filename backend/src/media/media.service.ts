import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as MinIO from 'minio';
import { randomUUID } from 'crypto';

@Injectable()
export class MediaService {
  private readonly isDisabled: boolean;
  private minioClient: MinIO.Client | null = null;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    this.isDisabled = this.configService.get('MINIO_DISABLED') === 'true';
    this.bucketName = this.configService.get('MINIO_BUCKET_NAME') ?? 'feellink-dev';

    if (this.isDisabled) {
      // Lokal geliştirmede MinIO bağlantısı gerekli değilse servisi mock'la
      return;
    }

    this.minioClient = new MinIO.Client({
      endPoint: this.configService.get('MINIO_ENDPOINT'),
      port: parseInt(this.configService.get('MINIO_PORT'), 10),
      useSSL: this.configService.get('MINIO_USE_SSL') === 'true',
      accessKey: this.configService.get('MINIO_ACCESS_KEY'),
      secretKey: this.configService.get('MINIO_SECRET_KEY'),
    });

    void this.ensureBucket();
  }

  private async ensureBucket() {
    if (!this.minioClient) {
      return;
    }

    const exists = await this.minioClient.bucketExists(this.bucketName);
    if (!exists) {
      await this.minioClient.makeBucket(this.bucketName);
      // Set bucket policy for public read access
      const policy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.bucketName}/*`],
          },
        ],
      };
      await this.minioClient.setBucketPolicy(this.bucketName, JSON.stringify(policy));
    }
  }

  async uploadFile(file: Express.Multer.File, folder: string = 'posts'): Promise<{ url: string; fileName: string; fileType: string }> {
    const fileName = `${folder}/${randomUUID()}-${file.originalname}`;

    if (this.isDisabled || !this.minioClient) {
      const base = this.configService.get('APP_URL') ?? 'http://localhost:3000';
      return {
        url: `${base}/static/${fileName}`,
        fileName: file.originalname,
        fileType: file.mimetype,
      };
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

    const endpoint = this.configService.get('MINIO_ENDPOINT');
    const port = this.configService.get('MINIO_PORT');
    const protocol = this.configService.get('MINIO_USE_SSL') === 'true' ? 'https' : 'http';
    
    return {
      url: `${protocol}://${endpoint}:${port}/${this.bucketName}/${fileName}`,
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
      const base = this.configService.get('APP_URL') ?? 'http://localhost:3000';
      return `${base}/static/${fileName}`;
    }

    const endpoint = this.configService.get('MINIO_ENDPOINT');
    const port = this.configService.get('MINIO_PORT');
    const protocol = this.configService.get('MINIO_USE_SSL') === 'true' ? 'https' : 'http';
    return `${protocol}://${endpoint}:${port}/${this.bucketName}/${fileName}`;
  }
}

