import { Module, forwardRef } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { ColorAnalysisService } from './color-analysis.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MediaModule } from '../media/media.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { FeedModule } from '../feed/feed.module';
import { SearchModule } from '../search/search.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { CommentsGateway } from './comments.gateway';
import { PostsGateway } from './posts.gateway';
import { ConfigModule } from '@nestjs/config';
import { LimitsModule } from '../limits/limits.module';
import { ChatModule } from '../chat/chat.module';
import { BlocksModule } from '../blocks/blocks.module';

@Module({
  imports: [
    PrismaModule,
    MediaModule,
    NotificationsModule,
    FeedModule,
    SearchModule,
    AnalyticsModule,
    ConfigModule,
    LimitsModule,
    forwardRef(() => ChatModule),
    BlocksModule,
  ],
  controllers: [PostsController],
  providers: [PostsService, ColorAnalysisService, CommentsGateway, PostsGateway],
  exports: [PostsService, ColorAnalysisService, MediaModule, CommentsGateway, PostsGateway],
})
export class PostsModule {}

