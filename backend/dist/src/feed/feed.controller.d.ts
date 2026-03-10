import { FeedService } from './feed.service';
export declare class FeedController {
    private feedService;
    constructor(feedService: FeedService);
    getFeed(user: any, limit?: string, cursor?: string): Promise<{
        posts: any[];
        nextCursor: any;
        hasMore: boolean;
    }>;
}
