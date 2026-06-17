import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Search')
@Controller('search')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Search across the platform' })
  async search(@Query('q') query: string, @Req() req: any) {
    return this.searchService.searchAll(query, req.user.organizationId);
  }

  @Get('courses')
  @ApiOperation({ summary: 'Search courses only' })
  async searchCourses(@Query('q') query: string, @Req() req: any) {
    return this.searchService.searchCourses(query, req.user.organizationId);
  }
}
