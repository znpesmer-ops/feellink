/// <reference types="multer" />
import { MediaService } from './media.service';
export declare class MediaController {
    private mediaService;
    constructor(mediaService: MediaService);
    uploadFile(file: Express.Multer.File, type?: string): Promise<{
        url: string;
        imageUrl: string;
        path: string;
        fileName: string;
        fileType: string;
    }>;
}
