import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : exception instanceof Error
        ? exception.message
        : 'Internal server error';

    // 🔥 KRİTİK: Tüm hataları detaylı logla
    let validationDetails = '';
    if (exception instanceof HttpException && status === 400) {
      const response = exception.getResponse();
      if (typeof response === 'object' && response !== null) {
        const resp = response as any;
        if (Array.isArray(resp.message)) {
          validationDetails = `\nValidation Errors: ${JSON.stringify(resp.message, null, 2)}`;
        } else if (resp.message) {
          validationDetails = `\nError Message: ${resp.message}`;
        }
      }
    }

    this.logger.error(
      `❌ ${request.method} ${request.url} - Status: ${status}${validationDetails}`,
      exception instanceof Error ? exception.stack : JSON.stringify(exception),
    );

    // Error details for development
    let errorMessage = typeof message === 'string' ? message : (message as any)?.message || 'Internal server error';
    let validationErrors: any = null;

    // ValidationPipe hatalarını detaylı göster
    if (exception instanceof HttpException && status === 400) {
      const response = exception.getResponse();
      if (typeof response === 'object' && response !== null) {
        const resp = response as any;
        if (Array.isArray(resp.message)) {
          // ValidationPipe array döndürüyor
          validationErrors = resp.message;
          errorMessage = `Validation failed: ${resp.message.join(', ')}`;
        } else if (resp.message) {
          errorMessage = resp.message;
        }
      }
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: errorMessage,
      ...(validationErrors ? { errors: validationErrors } : {}),
      ...(typeof message === 'object' && message !== null && !Array.isArray((message as any)?.message) ? message : {}),
    };

    // Development'ta stack trace de ekle
    if (process.env.NODE_ENV !== 'production' && exception instanceof Error) {
      (errorResponse as any).stack = exception.stack;
    }

    response.status(status).json(errorResponse);
  }
}


