"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SidebarModule = void 0;
const common_1 = require("@nestjs/common");
const sidebar_controller_1 = require("./sidebar.controller");
const sidebar_service_1 = require("./sidebar.service");
const sidebar_gateway_1 = require("./sidebar.gateway");
const prisma_module_1 = require("../prisma/prisma.module");
const admin_module_1 = require("../admin/admin.module");
const articles_module_1 = require("../articles/articles.module");
let SidebarModule = class SidebarModule {
};
exports.SidebarModule = SidebarModule;
exports.SidebarModule = SidebarModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule, (0, common_1.forwardRef)(() => admin_module_1.AdminModule), (0, common_1.forwardRef)(() => articles_module_1.ArticlesModule)],
        controllers: [sidebar_controller_1.SidebarController],
        providers: [sidebar_service_1.SidebarService, sidebar_gateway_1.SidebarGateway],
        exports: [sidebar_service_1.SidebarService, sidebar_gateway_1.SidebarGateway],
    })
], SidebarModule);
//# sourceMappingURL=sidebar.module.js.map