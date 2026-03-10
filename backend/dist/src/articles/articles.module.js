"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArticlesModule = void 0;
const common_1 = require("@nestjs/common");
const articles_controller_1 = require("./articles.controller");
const articles_service_1 = require("./articles.service");
const articles_gateway_1 = require("./articles.gateway");
const articles_scheduler_1 = require("./articles.scheduler");
const prisma_module_1 = require("../prisma/prisma.module");
const posts_module_1 = require("../posts/posts.module");
const auth_module_1 = require("../auth/auth.module");
const notifications_module_1 = require("../notifications/notifications.module");
let ArticlesModule = class ArticlesModule {
};
exports.ArticlesModule = ArticlesModule;
exports.ArticlesModule = ArticlesModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, (0, common_1.forwardRef)(() => posts_module_1.PostsModule), auth_module_1.AuthModule, (0, common_1.forwardRef)(() => notifications_module_1.NotificationsModule)],
        controllers: [articles_controller_1.ArticlesController],
        providers: [articles_service_1.ArticlesService, articles_gateway_1.ArticlesGateway, articles_scheduler_1.ArticleScheduler],
        exports: [articles_service_1.ArticlesService, articles_gateway_1.ArticlesGateway],
    })
], ArticlesModule);
//# sourceMappingURL=articles.module.js.map