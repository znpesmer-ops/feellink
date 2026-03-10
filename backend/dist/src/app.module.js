"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const schedule_1 = require("@nestjs/schedule");
const account_status_guard_1 = require("./auth/guards/account-status.guard");
const app_controller_1 = require("./app.controller");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const posts_module_1 = require("./posts/posts.module");
const follow_module_1 = require("./follow/follow.module");
const media_module_1 = require("./media/media.module");
const feed_module_1 = require("./feed/feed.module");
const notifications_module_1 = require("./notifications/notifications.module");
const search_module_1 = require("./search/search.module");
const stories_module_1 = require("./stories/stories.module");
const explore_module_1 = require("./explore/explore.module");
const admin_module_1 = require("./admin/admin.module");
const chat_module_1 = require("./chat/chat.module");
const articles_module_1 = require("./articles/articles.module");
const sidebar_module_1 = require("./sidebar/sidebar.module");
const collections_module_1 = require("./collections/collections.module");
const events_module_1 = require("./events/events.module");
const tickets_module_1 = require("./tickets/tickets.module");
const analytics_module_1 = require("./analytics/analytics.module");
const payments_module_1 = require("./payments/payments.module");
const jobs_module_1 = require("./jobs/jobs.module");
const limits_module_1 = require("./limits/limits.module");
const highlights_module_1 = require("./highlights/highlights.module");
const health_module_1 = require("./health/health.module");
const blocks_module_1 = require("./blocks/blocks.module");
const reports_module_1 = require("./reports/reports.module");
const email_change_module_1 = require("./email-change/email-change.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        controllers: [app_controller_1.AppController],
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            schedule_1.ScheduleModule.forRoot(),
            throttler_1.ThrottlerModule.forRoot([
                {
                    ttl: 60000,
                    limit: 100,
                },
            ]),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            posts_module_1.PostsModule,
            follow_module_1.FollowModule,
            media_module_1.MediaModule,
            feed_module_1.FeedModule,
            notifications_module_1.NotificationsModule,
            search_module_1.SearchModule,
            stories_module_1.StoriesModule,
            explore_module_1.ExploreModule,
            admin_module_1.AdminModule,
            chat_module_1.ChatModule,
            articles_module_1.ArticlesModule,
            sidebar_module_1.SidebarModule,
            collections_module_1.CollectionsModule,
            events_module_1.EventsModule,
            tickets_module_1.TicketsModule,
            analytics_module_1.AnalyticsModule,
            payments_module_1.PaymentsModule,
            jobs_module_1.JobsModule,
            limits_module_1.LimitsModule,
            highlights_module_1.HighlightsModule,
            health_module_1.HealthModule,
            blocks_module_1.BlocksModule,
            reports_module_1.ReportsModule,
            email_change_module_1.EmailChangeModule,
        ],
        providers: [
            {
                provide: core_1.APP_GUARD,
                useClass: account_status_guard_1.AccountStatusGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map