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
var ColorAnalysisService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ColorAnalysisService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let Vibrant = null;
try {
    Vibrant = require('node-vibrant');
}
catch (error) {
    common_1.Logger.warn('node-vibrant yüklenemedi, renk analizi devre dışı olacak');
}
let ColorAnalysisService = ColorAnalysisService_1 = class ColorAnalysisService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(ColorAnalysisService_1.name);
    }
    async extractColors(imageUrl) {
        if (!Vibrant) {
            this.logger.warn('node-vibrant yüklü değil, renk analizi yapılamıyor');
            return [];
        }
        try {
            let fullImageUrl = imageUrl;
            if (!imageUrl.startsWith('http')) {
                const baseUrl = this.configService.get('BASE_URL') || 'http://localhost:3002';
                fullImageUrl = `${baseUrl}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
            }
            const palette = await Vibrant.from(fullImageUrl)
                .quality(1)
                .getPalette();
            const colors = [];
            const colorKeys = ['Vibrant', 'Muted', 'DarkVibrant', 'DarkMuted', 'LightVibrant'];
            for (const key of colorKeys) {
                const swatch = palette[key];
                if (swatch) {
                    const hex = swatch.getHex();
                    if (hex && !colors.includes(hex)) {
                        colors.push(hex);
                    }
                }
            }
            return colors.slice(0, 5);
        }
        catch (error) {
            this.logger.error(`Renk analizi hatası (${imageUrl}):`, error);
            return [];
        }
    }
    calculateColorSimilarity(color1, color2) {
        try {
            const rgb1 = this.hexToRgb(color1);
            const rgb2 = this.hexToRgb(color2);
            if (!rgb1 || !rgb2)
                return 0;
            const distance = Math.sqrt(Math.pow(rgb1.r - rgb2.r, 2) +
                Math.pow(rgb1.g - rgb2.g, 2) +
                Math.pow(rgb1.b - rgb2.b, 2));
            const maxDistance = Math.sqrt(255 * 255 * 3);
            const similarity = (1 - distance / maxDistance) * 100;
            return Math.max(0, Math.min(100, similarity));
        }
        catch (error) {
            this.logger.error('Renk benzerliği hesaplama hatası:', error);
            return 0;
        }
    }
    async analyzeColors(imageUrl) {
        if (!Vibrant) {
            this.logger.warn('node-vibrant yüklü değil, renk analizi yapılamıyor');
            return null;
        }
        try {
            let fullImageUrl = imageUrl;
            if (!imageUrl.startsWith('http')) {
                const baseUrl = this.configService.get('BASE_URL') || 'http://localhost:3002';
                fullImageUrl = `${baseUrl}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
            }
            const palette = await Vibrant.from(fullImageUrl)
                .quality(1)
                .getPalette();
            const colors = [];
            const colorKeys = ['Vibrant', 'Muted', 'DarkVibrant', 'DarkMuted', 'LightVibrant'];
            for (const key of colorKeys) {
                const swatch = palette[key];
                if (swatch) {
                    const hex = swatch.getHex ? swatch.getHex() : (swatch.hex || null);
                    let rgb = [0, 0, 0];
                    if (swatch.rgb && Array.isArray(swatch.rgb)) {
                        rgb = swatch.rgb;
                    }
                    else if (swatch.getRgb) {
                        rgb = swatch.getRgb();
                    }
                    const population = swatch.population || 0;
                    if (hex) {
                        colors.push({
                            hex,
                            rgb,
                            population,
                        });
                    }
                }
            }
            return colors
                .sort((a, b) => b.population - a.population)
                .slice(0, 6);
        }
        catch (error) {
            this.logger.error(`Renk analizi hatası (${imageUrl}):`, error);
            return null;
        }
    }
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
            ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16),
            }
            : null;
    }
};
exports.ColorAnalysisService = ColorAnalysisService;
exports.ColorAnalysisService = ColorAnalysisService = ColorAnalysisService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ColorAnalysisService);
//# sourceMappingURL=color-analysis.service.js.map