import { Module, forwardRef } from '@nestjs/common';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';
import { ArticlesGateway } from './articles.gateway';
import { ArticleScheduler } from './articles.scheduler';
import { PrismaModule } from '../prisma/prisma.module';
import { PostsModule } from '../posts/posts.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, forwardRef(() => PostsModule), AuthModule, forwardRef(() => NotificationsModule)],
  controllers: [ArticlesController],
  providers: [ArticlesService, ArticlesGateway, ArticleScheduler],
  exports: [ArticlesService, ArticlesGateway],
})
export class ArticlesModule {}

