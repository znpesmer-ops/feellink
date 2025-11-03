import { Module, forwardRef } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MediaModule } from '../media/media.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { FeedModule } from '../feed/feed.module';
import { SearchModule } from '../search/search.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { CommentsGateway } from './comments.gateway';
import { PostsGateway } from './posts.gateway';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    PrismaModule,
    MediaModule,
    NotificationsModule,
    FeedModule,
    SearchModule,
    AnalyticsModule,
    ConfigModule,
  ],
  controllers: [PostsController],
  providers: [PostsService, CommentsGateway, PostsGateway],
  exports: [PostsService, MediaModule, CommentsGateway, PostsGateway],
})
export class PostsModule {}

