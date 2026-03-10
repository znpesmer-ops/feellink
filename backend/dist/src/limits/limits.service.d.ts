import { PrismaService } from '../prisma/prisma.service';
import { CapabilitySummary } from '../roles/roles.types';
export declare class LimitsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private getMonthStart;
    private loadUserCapabilities;
    ensureCanCreateEvent(userId: string): Promise<CapabilitySummary>;
    ensureCanCreateArtwork(userId: string): Promise<CapabilitySummary>;
    ensureLimit(userId: string, action: 'create_event' | 'upload_artwork' | 'create_collection' | 'create_job'): Promise<void>;
}
