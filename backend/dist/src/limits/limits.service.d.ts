import { PrismaService } from '../prisma/prisma.service';
import { CapabilitySummary } from '../roles/roles.types';
export declare class LimitsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private loadUserCapabilities;
    ensureCanCreateEvent(userId: string): Promise<CapabilitySummary>;
    ensureCanCreateArtwork(userId: string): Promise<CapabilitySummary>;
}
