import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'content_manager')
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('learners')
  @ApiOperation({ summary: 'Export learners report' })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv'] })
  async getLearners(@Query('format') format?: string) {
    return this.reports.getLearners(format);
  }

  @Get('courses')
  @ApiOperation({ summary: 'Export courses report' })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv'] })
  async getCourses(@Query('format') format?: string) {
    return this.reports.getCourses(format);
  }

  @Get('enrollments')
  @ApiOperation({ summary: 'Export enrollments report' })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv'] })
  async getEnrollments(@Query('format') format?: string) {
    return this.reports.getEnrollments(format);
  }

  @Get('certificates')
  @ApiOperation({ summary: 'Export certificates report' })
  @ApiQuery({ name: 'format', required: false, enum: ['json', 'csv'] })
  async getCertificates(@Query('format') format?: string) {
    return this.reports.getCertificates(format);
  }
}
