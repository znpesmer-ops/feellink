import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// node-vibrant'ı dinamik olarak yükle (opsiyonel - hata durumunda servis çalışmaya devam eder)
let Vibrant: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Vibrant = require('node-vibrant');
} catch (error) {
  Logger.warn('node-vibrant yüklenemedi, renk analizi devre dışı olacak');
}

@Injectable()
export class ColorAnalysisService {
  private readonly logger = new Logger(ColorAnalysisService.name);

  constructor(private configService: ConfigService) {}

  /**
   * Görselden en baskın 5 rengi çıkarır (HEX formatında)
   * @param imageUrl - Görsel URL'i (MinIO veya CDN)
   * @returns HEX renk kodları dizisi (en fazla 5)
   */
  async extractColors(imageUrl: string): Promise<string[]> {
    if (!Vibrant) {
      this.logger.warn('node-vibrant yüklü değil, renk analizi yapılamıyor');
      return [];
    }
    
    try {
      // URL'i düzenle - eğer relative path ise full URL'e çevir
      let fullImageUrl = imageUrl;

      // Relative path ise BASE_URL ekle
      if (!imageUrl.startsWith('http')) {
        const baseUrl = this.configService.get('BASE_URL') || 'http://localhost:3002';
        fullImageUrl = `${baseUrl}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
      }

      // Vibrant ile renk paletini çıkar
      const palette = await Vibrant.from(fullImageUrl)
        .quality(1) // Hızlı analiz için
        .getPalette();

      const colors: string[] = [];

      // Palette'teki renkleri topla (Vibrant, Muted, DarkVibrant, DarkMuted, LightVibrant, LightMuted)
      const colorKeys = ['Vibrant', 'Muted', 'DarkVibrant', 'DarkMuted', 'LightVibrant'];
      
      for (const key of colorKeys) {
        const swatch = palette[key as keyof typeof palette];
        if (swatch) {
          const hex = swatch.getHex();
          if (hex && !colors.includes(hex)) {
            colors.push(hex);
          }
        }
      }

      // En fazla 5 renk döndür
      return colors.slice(0, 5);
    } catch (error) {
      this.logger.error(`Renk analizi hatası (${imageUrl}):`, error);
      // Hata durumunda boş dizi döndür
      return [];
    }
  }

  /**
   * İki renk arasındaki benzerlik skorunu hesaplar (LAB Color Space kullanarak)
   * @param color1 - HEX renk kodu (#RRGGBB)
   * @param color2 - HEX renk kodu (#RRGGBB)
   * @returns Benzerlik skoru (0-100 arası, 100 = aynı)
   */
  calculateColorSimilarity(color1: string, color2: string): number {
    try {
      const rgb1 = this.hexToRgb(color1);
      const rgb2 = this.hexToRgb(color2);

      if (!rgb1 || !rgb2) return 0;

      // Euclidean distance kullanarak basit benzerlik hesaplama
      const distance = Math.sqrt(
        Math.pow(rgb1.r - rgb2.r, 2) +
        Math.pow(rgb1.g - rgb2.g, 2) +
        Math.pow(rgb1.b - rgb2.b, 2)
      );

      // Maksimum mesafe 441.67 (köşegen)
      const maxDistance = Math.sqrt(255 * 255 * 3);
      const similarity = (1 - distance / maxDistance) * 100;

      return Math.max(0, Math.min(100, similarity));
    } catch (error) {
      this.logger.error('Renk benzerliği hesaplama hatası:', error);
      return 0;
    }
  }

  /**
   * Görselden detaylı renk paleti çıkarır (hex, rgb, population bilgileri ile)
   * @param imageUrl - Görsel URL'i (MinIO veya CDN)
   * @returns Detaylı renk paleti array'i (hex, rgb, population)
   */
  async analyzeColors(imageUrl: string): Promise<Array<{ hex: string; rgb: number[]; population: number }> | null> {
    if (!Vibrant) {
      this.logger.warn('node-vibrant yüklü değil, renk analizi yapılamıyor');
      return null;
    }
    
    try {
      // URL'i düzenle - eğer relative path ise full URL'e çevir
      let fullImageUrl = imageUrl;

      // Relative path ise BASE_URL ekle
      if (!imageUrl.startsWith('http')) {
        const baseUrl = this.configService.get('BASE_URL') || 'http://localhost:3002';
        fullImageUrl = `${baseUrl}${imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`}`;
      }

      // Vibrant ile renk paletini çıkar
      const palette = await Vibrant.from(fullImageUrl)
        .quality(1) // Hızlı analiz için
        .getPalette();

      const colors: Array<{ hex: string; rgb: number[]; population: number }> = [];

      // Palette'teki renkleri topla (Vibrant, Muted, DarkVibrant, DarkMuted, LightVibrant, LightMuted)
      const colorKeys = ['Vibrant', 'Muted', 'DarkVibrant', 'DarkMuted', 'LightVibrant'];
      
      for (const key of colorKeys) {
        const swatch = palette[key as keyof typeof palette] as any;
        if (swatch) {
          const hex = swatch.getHex ? swatch.getHex() : (swatch.hex || null);
          // Swatch'ta rgb direkt property veya getRgb() metodu olabilir
          let rgb: number[] = [0, 0, 0];
          if (swatch.rgb && Array.isArray(swatch.rgb)) {
            rgb = swatch.rgb;
          } else if (swatch.getRgb) {
            rgb = swatch.getRgb();
          }
          
          // Population direkt property olarak var
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

      // En fazla 6 renk döndür (population'a göre sırala)
      return colors
        .sort((a, b) => b.population - a.population)
        .slice(0, 6);
    } catch (error) {
      this.logger.error(`Renk analizi hatası (${imageUrl}):`, error);
      // Hata durumunda null döndür
      return null;
    }
  }

  /**
   * HEX renk kodunu RGB'ye çevirir
   */
  private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }
}

