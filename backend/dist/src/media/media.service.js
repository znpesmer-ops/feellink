"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const crypto_1 = require("crypto");
const blob_1 = require("@vercel/blob");
let MediaService = class MediaService {
    constructor(configService) {
        this.configService = configService;
        console.log('📦 [MediaService] PRODUCTION MODE - SADECE Vercel Blob');
    }
    async uploadFile(file, folder = 'posts') {
        const fileName = `${folder}/${(0, crypto_1.randomUUID)()}-${file.originalname}`;
        console.log(`📤 [MediaService] uploadFile START:`, {
            fileName,
            size: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
            mimetype: file.mimetype,
        });
        const blobToken = this.configService.get('BLOB_READ_WRITE_TOKEN');
        if (!blobToken) {
            console.error('❌ [UPLOAD_ERROR] BLOB_READ_WRITE_TOKEN MISSING!');
            console.error('Available env vars:', Object.keys(process.env).filter(k => k.includes('BLOB')));
            throw new Error('BLOB_READ_WRITE_TOKEN eksik - Vercel backend env ayarlarını kontrol edin!');
        }
        try {
            console.log(`☁️ [MediaService] Uploading to Vercel Blob...`);
            const blob = await (0, blob_1.put)(fileName, file.buffer, {
                access: 'public',
                contentType: file.mimetype,
                token: blobToken,
            });
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
        }
        catch (error) {
            console.error('❌ [UPLOAD_ERROR] Vercel Blob upload FAILED:', {
                message: error?.message,
                code: error?.code,
                stack: error?.stack?.split('\n')[0],
            });
            throw new Error(`Upload hatası: ${error?.message || 'Bilinmeyen hata'}`);
        }
    }
    async deleteFile(fileUrl) {
        console.log('[MediaService] Delete file request (Vercel Blob - no action needed):', fileUrl);
        return;
    }
    getPublicUrl(fileName) {
        console.log('[MediaService] getPublicUrl - Vercel Blob URLs are absolute');
        return fileName;
    }
};
exports.MediaService = MediaService;
exports.MediaService = MediaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MediaService);
//# sourceMappingURL=media.service.js.map