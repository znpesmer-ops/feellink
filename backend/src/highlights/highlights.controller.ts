import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { HighlightsService } from './highlights.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Highlights')
@Controller('highlights')
export class HighlightsController {
  constructor(
    private highlightsService: HighlightsService,
    private prisma: PrismaService,
  ) {}

  @Get('monthly')
  @ApiOperation({ summary: 'Get monthly highlights (Ayın Öne Çıkanları)' })
  async getMonthlyHighlights() {
    return this.highlightsService.getMonthlyHighlights();
  }

  // ✅ Get user highlights by userId (daha spesifik route)
  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user highlights by userId' })
  async getHighlightsByUserId(@Param('userId') userId: string) {
    return this.prisma.highlight.findMany({
      where: { userId },
      include: {
        coverPost: {
          select: {
            id: true,
            media: {
              select: {
                url: true,
                type: true,
              },
              take: 1,
            },
          },
        },
        items: {
          include: {
            post: {
              select: {
                id: true,
                caption: true,
                title: true,
                media: {
                  select: {
                    url: true,
                    type: true,
                  },
                  take: 1,
                },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ✅ Get user highlights by username (en genel route - SONDA olmalı)
  @Get(':username')
  @ApiOperation({ summary: 'Get user highlights by username' })
  async getHighlightsByUsername(@Param('username') username: string) {
    // "monthly", "user" gibi keyword'lerle çakışmasın
    if (username === 'monthly' || username === 'user') {
      throw new BadRequestException('Invalid username');
    }
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.highlight.findMany({
      where: { userId: user.id },
      include: {
        coverPost: {
          select: {
            id: true,
            media: {
              select: {
                url: true,
                type: true,
              },
              take: 1,
            },
          },
        },
        items: {
          include: {
            post: {
              select: {
                id: true,
                caption: true,
                title: true,
                media: {
                  select: {
                    url: true,
                    type: true,
                  },
                  take: 1,
                },
              },
            },
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ✅ Create highlight
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new highlight' })
  async createHighlight(
    @Body() body: { title: string; coverPostId?: string },
    @Req() req,
  ) {
    if (!req.user || !req.user.id) {
      throw new BadRequestException('Kullanıcı doğrulaması başarısız');
    }
    return this.prisma.highlight.create({
      data: {
        title: body.title,
        userId: req.user.id,
        coverPostId: body.coverPostId || null,
      },
      include: {
        coverPost: {
          select: {
            id: true,
            media: {
              select: {
                url: true,
                type: true,
              },
              take: 1,
            },
          },
        },
        items: true,
      },
    });
  }

  // ✅ Delete highlight - PRODUCTION SAFE with proper error handling
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a highlight' })
  async deleteHighlight(@Param('id') id: string, @Req() req) {
    // Validate user
    if (!req.user || !req.user.id) {
      throw new BadRequestException('Kullanıcı doğrulaması başarısız');
    }

    // Validate ID
    if (!id || id === 'undefined' || id === 'null') {
      throw new BadRequestException('Valid highlight ID is required');
    }

    // Find highlight
    const highlight = await this.prisma.highlight.findUnique({
      where: { id },
    });

    // Check if exists
    if (!highlight) {
      throw new NotFoundException('Highlight not found');
    }

    // Check ownership
    if (highlight.userId !== req.user.id) {
      throw new ForbiddenException('You can only delete your own highlights');
    }

    // Delete (cascade will handle items)
    await this.prisma.highlight.delete({
      where: { id },
    });

    return { success: true, message: 'Highlight deleted successfully' };
  }

  // ✅ Add posts to highlight
  @Post(':id/add-posts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add posts to highlight' })
  async addPostsToHighlight(
    @Param('id') id: string,
    @Body() body: { postIds: string[] },
    @Req() req,
  ) {
    if (!req.user || !req.user.id) {
      throw new BadRequestException('Kullanıcı doğrulaması başarısız');
    }
    if (!id) {
      throw new BadRequestException('Highlight ID is required');
    }

    const highlight = await this.prisma.highlight.findUnique({
      where: { id },
    });

    if (!highlight) {
      throw new NotFoundException('Highlight not found');
    }

    if (highlight.userId !== req.user.id) {
      throw new ForbiddenException('You can only modify your own highlights');
    }

    // Get existing items to determine next sort order
    const existingItems = await this.prisma.highlightItem.findMany({
      where: { highlightId: id },
    });

    let maxSortOrder = existingItems.length > 0
      ? Math.max(...existingItems.map((item) => item.sortOrder))
      : 0;

    // Add new items
    const createPromises = body.postIds.map((postId, index) =>
      this.prisma.highlightItem.create({
        data: {
          highlightId: id,
          postId,
          sortOrder: maxSortOrder + index + 1,
        },
      }),
    );

    await Promise.all(createPromises);

    return { success: true, message: 'Posts added to highlight' };
  }

  // ✅ Remove posts from highlight
  @Delete(':id/remove-posts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove posts from highlight' })
  async removePostsFromHighlight(
    @Param('id') id: string,
    @Body() body: { postIds: string[] },
    @Req() req,
  ) {
    if (!req.user || !req.user.id) {
      throw new BadRequestException('Kullanıcı doğrulaması başarısız');
    }
    if (!id) {
      throw new BadRequestException('Highlight ID is required');
    }

    const highlight = await this.prisma.highlight.findUnique({
      where: { id },
    });

    if (!highlight) {
      throw new NotFoundException('Highlight not found');
    }

    if (highlight.userId !== req.user.id) {
      throw new ForbiddenException('You can only modify your own highlights');
    }

    // Remove items
    await this.prisma.highlightItem.deleteMany({
      where: {
        highlightId: id,
        postId: { in: body.postIds },
      },
    });

    return { success: true, message: 'Posts removed from highlight' };
  }

  // ✅ Update highlight title
  @Post(':id/rename')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rename highlight' })
  async renameHighlight(
    @Param('id') id: string,
    @Body() body: { title: string },
    @Req() req,
  ) {
    if (!req.user || !req.user.id) {
      throw new BadRequestException('Kullanıcı doğrulaması başarısız');
    }
    if (!id) {
      throw new BadRequestException('Highlight ID is required');
    }

    const highlight = await this.prisma.highlight.findUnique({
      where: { id },
    });

    if (!highlight) {
      throw new NotFoundException('Highlight not found');
    }

    if (highlight.userId !== req.user.id) {
      throw new ForbiddenException('You can only modify your own highlights');
    }

    return this.prisma.highlight.update({
      where: { id },
      data: { title: body.title },
    });
  }
}
