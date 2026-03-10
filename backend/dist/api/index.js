"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const FORCE_DEPLOY_TRIGGER = 'BACKEND_ONLY_2026_01_23_22_40';
const FORCE_DEPLOY_TRIGGER_2 = 'BACKEND_DEPLOY_REQUIRED_NOW';
const FORCE_DEPLOY_TRIGGER_3 = 'PRODUCTION_ENVIRONMENT_DEPLOY';
const FORCE_DEPLOY_TRIGGER_4 = 'JSON_SYNTAX_ERROR_FIXED';
const FORCE_DEPLOY_TRIGGER_5 = 'BACKEND_CLASSORU_ONLY_NO_FRONTEND';
const FORCE_DEPLOY_TRIGGER_6 = 'ROOT_DIRECTORY_MUST_BE_BACKEND';
const FORCE_DEPLOY_TRIGGER_7 = 'DO_NOT_TOUCH_FRONTEND';
const FORCE_DEPLOY_TRIGGER_8 = 'REDEPLOY_ERROR_DEPLOYMENT_3qucHr8Ci';
const FORCE_DEPLOY_TRIGGER_9 = 'BACKEND_SRC_FILES_CHANGED';
const FORCE_DEPLOY_TRIGGER_10 = 'ERROR_FIX_DR9sN1xaN';
const FORCE_DEPLOY_TRIGGER_11 = 'BACKEND_REDEPLOY_2026_03_08';
const FORCE_DEPLOY_TRIGGER_12 = 'FEELLINK_BACKEND_PRODUCTION_DEPLOY';
const FORCE_DEPLOY_TRIGGER_13 = 'INITIAL_DEPLOY_2026_03_14';
const FORCE_DEPLOY_TRIGGER_14 = 'PUSH_TO_CREATE_DEPLOYMENT_2026_03_09';
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const express_1 = require("express");
const cookie_parser_1 = require("cookie-parser");
const app_module_1 = require("../src/app.module");
let cachedServer = null;
async function bootstrapServer() {
    if (cachedServer) {
        return cachedServer;
    }
    try {
        console.log('🚀 Starting NestJS bootstrap...');
        console.log('Environment check:', {
            NODE_ENV: process.env.NODE_ENV,
            DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'MISSING',
            JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'MISSING',
        });
        const app = await core_1.NestFactory.create(app_module_1.AppModule, {
            logger: ['error', 'warn', 'log'],
        });
        const logger = new common_1.Logger('Bootstrap');
        app.use((0, cookie_parser_1.default)());
        app.use('/favicon.ico', (_, res) => {
            res.status(204).end();
        });
        app.use('/payments/webhook', (0, express_1.raw)({ type: 'application/json' }));
        app.use((0, express_1.json)({ limit: '50mb' }));
        app.use((0, express_1.urlencoded)({ limit: '50mb', extended: true }));
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
    catch (bootstrapError) {
        console.error('🔥 BOOTSTRAP ERROR:', {
            message: bootstrapError?.message,
            stack: bootstrapError?.stack,
            name: bootstrapError?.name,
        });
        throw bootstrapError;
    }
}
async function handler(req, res) {
    try {
        const origin = req.headers.origin || req.headers.referer;
        const allowedOrigins = [
            'https://feellink.io',
            'https://www.feellink.io',
            'https://feellink.vercel.app',
            'http://localhost:3000',
            'http://localhost:3001',
        ];
        if (origin && (allowedOrigins.some(allowed => origin.startsWith(allowed)) || origin.includes('vercel.app'))) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Credentials', 'true');
            res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS,HEAD');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
            res.setHeader('Access-Control-Max-Age', '86400');
        }
        if (req.method === 'OPTIONS') {
            res.status(204).end();
            return;
        }
        let path = (req.url || '/').split('?')[0].replace(/\/$/, '') || '/';
        if (path.startsWith('/api'))
            path = path.slice(4) || '/';
        if (path === '')
            path = '/';
        const readyPaths = ['/', '/health', '/ready', '/ping', '/live'];
        const isReadyRequest = req.method === 'GET' && readyPaths.includes(path);
        if (isReadyRequest) {
            res.setHeader('Content-Type', 'application/json');
            res.status(200).end(JSON.stringify({
                status: 'ok',
                ready: true,
                service: 'Feellink Backend API',
                timestamp: new Date().toISOString(),
            }));
            return;
        }
        const qs = (req.url || '').includes('?') ? '?' + (req.url || '').split('?')[1] : '';
        req.url = path + qs;
        console.log(`📥 Request: ${req.method} ${req.url} from ${origin || 'unknown'}`);
        let server;
        try {
            server = await bootstrapServer();
        }
        catch (bootstrapErr) {
            console.error('🔥 Bootstrap failed (non-ready request):', bootstrapErr?.message);
            if (!res.headersSent) {
                res.setHeader('Content-Type', 'application/json');
                res.status(503).end(JSON.stringify({
                    statusCode: 503,
                    message: 'Service temporarily unavailable',
                    error: 'Service Unavailable',
                }));
            }
            return;
        }
        return new Promise((resolve) => {
            res.on('finish', () => resolve());
            res.on('close', () => resolve());
            const errorHandler = (err) => {
                console.error('🔥 SERVER ERROR:', err);
                if (!res.headersSent) {
                    res.status(500).json({
                        statusCode: 500,
                        message: 'Internal Server Error',
                        error: 'Internal Server Error',
                    });
                }
                resolve();
            };
            const timeout = setTimeout(() => {
                if (!res.headersSent) {
                    res.status(504).json({
                        statusCode: 504,
                        message: 'Request Timeout',
                        error: 'Gateway Timeout',
                    });
                }
                resolve();
            }, 29000);
            try {
                server(req, res);
                res.once('finish', () => clearTimeout(timeout));
                res.once('close', () => clearTimeout(timeout));
            }
            catch (syncError) {
                clearTimeout(timeout);
                errorHandler(syncError);
            }
        });
    }
    catch (err) {
        const errorDetails = {
            message: err?.message,
            stack: err?.stack,
            name: err?.name,
            path: req.url,
            method: req.method,
        };
        console.error('🔥 VERCEL RUNTIME ERROR:', JSON.stringify(errorDetails, null, 2));
        if (!res.headersSent) {
            res.setHeader('Content-Type', 'application/json');
            res.status(503).end(JSON.stringify({
                statusCode: 503,
                message: 'Service temporarily unavailable',
                error: 'Service Unavailable',
            }));
        }
    }
}
exports.default = handler;
//# sourceMappingURL=index.js.map