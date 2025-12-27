import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { HighlightsService } from './highlights.service';

@ApiTags('Highlights')
@Controller('highlights')
export class HighlightsController {
  constructor(private highlightsService: HighlightsService) {}

  @Get('monthly')
  @ApiOperation({ summary: 'Get monthly highlights (Ayın Öne Çıkanları)' })
  async getMonthlyHighlights() {
    return this.highlightsService.getMonthlyHighlights();
  }
}
