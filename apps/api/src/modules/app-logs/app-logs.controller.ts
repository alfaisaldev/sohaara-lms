import { Controller, Get, Query, Param, Delete, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { AppLogsService } from './app-logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('app-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin')
export class AppLogsController {
  constructor(private readonly appLogs: AppLogsService) {}

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('level') level?: string,
    @Query('method') method?: string,
    @Query('statusCode') statusCode?: string,
    @Query('errorCode') errorCode?: string,
    @Query('context') context?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: 'asc' | 'desc',
  ) {
    return this.appLogs.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      level,
      method,
      statusCode: statusCode ? parseInt(statusCode, 10) : undefined,
      errorCode,
      context,
      startDate,
      endDate,
      sortBy,
      sortDir,
    });
  }

  @Get('levels')
  async getLevels() {
    return this.appLogs.getLevels();
  }

  @Get('stats')
  async getStats() {
    return this.appLogs.getStats();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const result = await this.appLogs.findAll({ page: 1, limit: 1, search: id });
    return result.data[0] || null;
  }

  @Delete('cleanup')
  @HttpCode(HttpStatus.OK)
  async cleanup(@Query('days') days?: string) {
    return this.appLogs.clearOlderThan(days ? parseInt(days, 10) : 90);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  async clearAll() {
    return this.appLogs.clearAll();
  }
}
