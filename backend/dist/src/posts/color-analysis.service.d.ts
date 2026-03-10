import { ConfigService } from '@nestjs/config';
export declare class ColorAnalysisService {
    private configService;
    private readonly logger;
    constructor(configService: ConfigService);
    extractColors(imageUrl: string): Promise<string[]>;
    calculateColorSimilarity(color1: string, color2: string): number;
    analyzeColors(imageUrl: string): Promise<Array<{
        hex: string;
        rgb: number[];
        population: number;
    }> | null>;
    private hexToRgb;
}
