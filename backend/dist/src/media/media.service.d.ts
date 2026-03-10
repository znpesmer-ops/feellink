/// <reference types="multer" />
import { ConfigService } from '@nestjs/config';
export declare class MediaService {
    private configService;
    constructor(configService: ConfigService);
    uploadFile(file: Express.Multer.File, folder?: string): Promise<{
        url: string;
        fileName: string;
        fileType: string;
    }>;
    deleteFile(fileUrl: string): Promise<void>;
    getPublicUrl(fileName: string): string;
}
