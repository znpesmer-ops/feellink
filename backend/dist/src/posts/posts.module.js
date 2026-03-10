"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostsModule = void 0;
const common_1 = require("@nestjs/common");
const posts_controller_1 = require("./posts.controller");
const posts_service_1 = require("./posts.service");
const color_analysis_service_1 = require("./color-analysis.service");
const prisma_module_1 = require("../prisma/prisma.module");
const media_module_1 = require("../media/media.module");
const notifications_module_1 = require("../notifications/notifications.module");
const feed_module_1 = require("../feed/feed.module");
const search_module_1 = require("../search/search.module");
const analytics_module_1 = require("../analytics/analytics.module");
const comments_gateway_1 = require("./comments.gateway");
const posts_gateway_1 = require("./posts.gateway");
const config_1 = require("@nestjs/config");
const limits_module_1 = require("../limits/limits.module");
let PostsModule = class PostsModule {
};
exports.PostsModule = PostsModule;
exports.PostsModule = PostsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            media_module_1.MediaModule,
            notifications_module_1.NotificationsModule,
            feed_module_1.FeedModule,
            search_module_1.SearchModule,
            analytics_module_1.AnalyticsModule,
            config_1.ConfigModule,
            limits_module_1.LimitsModule,
        ],
        controllers: [posts_controller_1.PostsController],
        providers: [posts_service_1.PostsService, color_analysis_service_1.ColorAnalysisService, comments_gateway_1.CommentsGateway, posts_gateway_1.PostsGateway],
        exports: [posts_service_1.PostsService, color_analysis_service_1.ColorAnalysisService, media_module_1.MediaModule, comments_gateway_1.CommentsGateway, posts_gateway_1.PostsGateway],
    })
], PostsModule);
//# sourceMappingURL=posts.module.js.map