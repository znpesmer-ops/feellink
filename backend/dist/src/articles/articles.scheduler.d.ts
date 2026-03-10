import { PrismaService } from '../prisma/prisma.service';
import { PostsGateway } from '../posts/posts.gateway';
export declare class ArticleScheduler {
    private prisma;
    private postsGateway;
    constructor(prisma: PrismaService, postsGateway: PostsGateway);
    publishScheduledArticles(): Promise<void>;
}
