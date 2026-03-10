import { SearchService } from './search.service';
export declare class SearchController {
    private searchService;
    constructor(searchService: SearchService);
    searchUsers(query: string, limit?: string, user?: any): Promise<any>;
    searchHashtags(query: string, limit?: string): Promise<any>;
}
