import { Controller, Get, Post, Body, Param, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { TicketsService } from './tickets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('tickets')
export class TicketsController {
  constructor(private ticketsService: TicketsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createTicket(@CurrentUser() user: any, @Body() data: any) {
    return this.ticketsService.createTicket(user.id, data);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  async getMyTickets(@CurrentUser() user: any) {
    return this.ticketsService.getMyTickets(user.id);
  }

  @Get('event/:eventId')
  async getEventTickets(@Param('eventId') eventId: string) {
    return this.ticketsService.getEventTickets(eventId);
  }

  @Post('purchase')
  @UseGuards(JwtAuthGuard)
  async purchaseTicket(@CurrentUser() user: any, @Body() data: any) {
    return this.ticketsService.purchaseTicket(user.id, data);
  }

  @Post('validate')
  @UseGuards(JwtAuthGuard)
  async validateTicket(@CurrentUser() user: any, @Body() data: any) {
    return this.ticketsService.validateTicket(data);
  }

  @Get('pdf/:code')
  @UseGuards(JwtAuthGuard)
  async generateTicketPdf(@Param('code') code: string, @Res() res: Response) {
    return this.ticketsService.generateTicketPdf(code, res);
  }
}

