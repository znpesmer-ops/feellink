import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PostsModule } from './posts/posts.module';
import { FollowModule } from './follow/follow.module';
import { MediaModule } from './media/media.module';
import { FeedModule } from './feed/feed.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SearchModule } from './search/search.module';
import { StoriesModule } from './stories/stories.module';
import { ExploreModule } from './explore/explore.module';
import { AdminModule } from './admin/admin.module';
import { ChatModule } from './chat/chat.module';
import { ArticlesModule } from './articles/articles.module';
import { SidebarModule } from './sidebar/sidebar.module';
import { CollectionsModule } from './collections/collections.module';
import { EventsModule } from './events/events.module';
import { TicketsModule } from './tickets/tickets.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { PaymentsModule } from './payments/payments.module';
import { JobsModule } from './jobs/jobs.module';
import { LimitsModule } from './limits/limits.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    AuthModule,
    UsersModule,
    PostsModule,
    FollowModule,
    MediaModule,
    FeedModule,
    NotificationsModule,
    SearchModule,
    StoriesModule,
    ExploreModule,
    AdminModule,
    ChatModule,
    ArticlesModule,
    SidebarModule,
    CollectionsModule,
    EventsModule,
    TicketsModule,
    AnalyticsModule,
    PaymentsModule,
    JobsModule,
    LimitsModule,
  ],
})
export class AppModule {}

