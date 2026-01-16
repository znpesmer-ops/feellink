// Vercel serverless function - JavaScript for maximum compatibility
const { NestFactory } = require('@nestjs/core');
const { ValidationPipe, Logger, HttpException } = require('@nestjs/common');
const { json, raw, urlencoded } = require('express');
const cookieParser = require('cookie-parser');

// Import AppModule - handle both default and named export
let AppModule;
try {
  const appModuleModule = require('../dist/app.module');
  AppModule = appModuleModule.AppModule || appModuleModule.default || appModuleModule;
  if (!AppModule) {
    throw new Error('AppModule not found in dist/app.module');
  }
} catch (err) {
  console.error('Failed to import AppModule:', err);
  throw err;
}

let cachedServer = null;

async function bootstrapServer() {
  if (cachedServer) {
    return cachedServer;
  }

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const logger = new Logger('Bootstrap');

  app.use(cookieParser());

  app.use('/favicon.ico', (_, res) => {
    res.status(204).end();
  });

  app.use('/payments/webhook', raw({ type: 'application/json' }));

  app.use(json({ limit: '2mb' }));
  app.use(urlencoded({ limit: '2mb', extended: true }));

  app.enableCors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
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
        const logger = new Logger('ValidationPipe');
        logger.error(`Validation failed: ${JSON.stringify(messages, null, 2)}`);
        return new HttpException(
          {
            statusCode: 400,
            message: messages,
            error: 'Bad Request',
          },
          400,
        );
      },
    }),
  );

  await app.init();

  const server = app.getHttpAdapter().getInstance();
  cachedServer = server;

  logger.log('✅ NestJS initialized for Vercel');
  return server;
}

module.exports = async function handler(req, res) {
  try {
    const server = await bootstrapServer();
    server(req, res);
  } catch (err) {
    // Detailed error logging for debugging
    const errorDetails = {
      message: err?.message,
      stack: err?.stack,
      name: err?.name,
      code: err?.code,
      cause: err?.cause,
    };
    
    console.error('🔥 VERCEL RUNTIME ERROR:', JSON.stringify(errorDetails, null, 2));
    console.error('Environment check:', {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'MISSING',
      JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'MISSING',
    });

    if (!res.headersSent) {
      res.status(500).json({
        statusCode: 500,
        message: process.env.NODE_ENV === 'production' 
          ? 'Internal Server Error' 
          : err?.message || 'Internal Server Error',
        error: 'Internal Server Error',
        ...(process.env.NODE_ENV !== 'production' && { details: errorDetails }),
      });
    }
  }
};
