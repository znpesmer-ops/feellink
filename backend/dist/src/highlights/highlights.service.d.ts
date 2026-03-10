import { PrismaService } from '../prisma/prisma.service';
export declare class HighlightsService {
    private prisma;
    constructor(prisma: PrismaService);
    getMonthlyHighlights(): Promise<any>;
    private selectAutomaticHighlights;
}
