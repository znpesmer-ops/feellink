"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HighlightsModule = void 0;
const common_1 = require("@nestjs/common");
const highlights_controller_1 = require("./highlights.controller");
const highlights_service_1 = require("./highlights.service");
const prisma_module_1 = require("../prisma/prisma.module");
const prisma_service_1 = require("../prisma/prisma.service");
let HighlightsModule = class HighlightsModule {
};
exports.HighlightsModule = HighlightsModule;
exports.HighlightsModule = HighlightsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [highlights_controller_1.HighlightsController],
        providers: [highlights_service_1.HighlightsService, prisma_service_1.PrismaService],
        exports: [highlights_service_1.HighlightsService],
    })
], HighlightsModule);
//# sourceMappingURL=highlights.module.js.map