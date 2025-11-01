import { Module, forwardRef } from '@nestjs/common';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';
import { ArticleScheduler } from './articles.scheduler';
import { PrismaModule } from '../prisma/prisma.module';
import { PostsModule } from '../posts/posts.module';

@Module({
  imports: [PrismaModule, forwardRef(() => PostsModule)],
  controllers: [ArticlesController],
  providers: [ArticlesService, ArticleScheduler],
  exports: [ArticlesService],
})
export class ArticlesModule {}

