import {
  Controller,
  Post,
  Get,
  Patch,
  UseGuards,
  Body,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ReportReason } from '@prisma/client';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Post()
  async createReport(
    @CurrentUser() user: any,
    @Body()
    body: {
      reportedUserId?: string;
      contentType?: 'post' | 'comment';
      contentId?: string;
      conversationId?: string;
      messageId?: string;
      reason: ReportReason;
      note?: string;
    },
  ) {
    // Post/Comment raporlama
    if (body.contentType && body.contentId) {
      return this.reportsService.createContentReport(
        user.id,
        body.contentType,
        body.contentId,
        body.reason,
        body.note,
      );
    }

    // Kullanıcı raporlama (eski endpoint)
    if (body.reportedUserId) {
      return this.reportsService.createReport(
        user.id,
        body.reportedUserId,
        body.reason,
        body.conversationId,
        body.messageId,
        body.note,
      );
    }

    throw new BadRequestException('Either reportedUserId or contentType+contentId must be provided');
  }

  @Get('admin')
  @UseGuards(AdminGuard)
  async getReports(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reportsService.getReports(
      status,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @Get('admin/:id')
  @UseGuards(AdminGuard)
  async getReportById(@Param('id') reportId: string) {
    return this.reportsService.getReportById(reportId);
  }

  @Patch('admin/:id')
  @UseGuards(AdminGuard)
  async updateReportStatus(
    @Param('id') reportId: string,
    @Body() body: { status: string },
  ) {
    return this.reportsService.updateReportStatus(reportId, body.status);
  }
}



