"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const express_1 = require("express");
const cookie_parser_1 = require("cookie-parser");
const express = require("express");
const path_1 = require("path");
const app_module_1 = require("./app.module");
let cachedServer;
async function bootstrapServer() {
    if (cachedServer) {
        return cachedServer;
    }
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: ['error', 'warn', 'log'],
    });
    const logger = new common_1.Logger('Bootstrap');
    app.use((0, cookie_parser_1.default)());
    const isVercel = process.env.VERCEL === '1';
    const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
    if (!isVercel || !blobToken) {
        const staticPath = (0, path_1.join)(process.cwd(), 'instagram-uploads');
        app.use('/instagram-uploads', express.static(staticPath, {
            setHeaders: (res) => {
                res.set('Cache-Control', 'public, max-age=31536000');
            },
        }));
    }
    app.use('/favicon.ico', (_, res) => {
        res.status(204).end();
    });
    app.use('/payments/webhook', (0, express_1.raw)({ type: 'application/json' }));
    app.use((0, express_1.json)({ limit: '2mb' }));
    app.use((0, express_1.urlencoded)({ limit: '2mb', extended: true }));
    const allowedOrigins = [
        'https://feellink.io',
        'https://www.feellink.io',
        'https://feellink.vercel.app',
        'http://localhost:3000',
        'http://localhost:3001',
    ];
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin) {
                callback(null, true);
                return;
            }
            if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
                callback(null, true);
                return;
            }
            if (origin.includes('vercel.app')) {
                callback(null, true);
                return;
            }
            console.warn(`❌ CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'X-Requested-With',
            'Accept',
            'Origin',
            'Access-Control-Request-Method',
            'Access-Control-Request-Headers',
        ],
        exposedHeaders: ['Content-Length', 'Content-Type'],
        maxAge: 86400,
        preflightContinue: false,
        optionsSuccessStatus: 204,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: false,
        enableDebugMessages: process.env.NODE_ENV !== 'production',
        transformOptions: {
            enableImplicitConversion: true,
        },
        exceptionFactory: (errors) => {
            const messages = errors.map((error) => {
                const constraints = error.constraints || {};
                return Object.values(constraints).join(', ');
            });
            const logger = new common_1.Logger('ValidationPipe');
            logger.error(`Validation failed: ${JSON.stringify(messages, null, 2)}`);
            return new common_1.HttpException({
                statusCode: 400,
                message: messages,
                error: 'Bad Request',
            }, 400);
        },
    }));
    await app.init();
    const server = app.getHttpAdapter().getInstance();
    cachedServer = server;
    logger.log('✅ NestJS initialized for Vercel');
    return server;
}
async function handler(req, res) {
    try {
        const server = await bootstrapServer();
        server(req, res);
    }
    catch (err) {
        console.error('🔥 VERCEL UNHANDLED ERROR:', {
            message: err?.message,
            stack: err?.stack,
            name: err?.name,
        });
        if (!res.headersSent) {
            res.status(500).json({
                statusCode: 500,
                message: err?.message || 'Internal Server Error',
                error: 'Internal Server Error',
            });
        }
    }
}
exports.default = handler;
//# sourceMappingURL=main.js.map