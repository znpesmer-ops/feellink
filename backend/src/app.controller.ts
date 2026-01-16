import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('/')
  root() {
    return {
      status: 'ok',
      service: 'feellink-backend',
      env: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('/health')
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'Feellink Backend API',
    };
  }
}
