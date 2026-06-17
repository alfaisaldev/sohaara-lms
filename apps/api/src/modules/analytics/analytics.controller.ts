import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Org-level dashboard stats' })
  async getDashboard(@Req() req: any) {
    return this.analytics.getDashboardStats(req.user.organizationId);
  }

  @Get('courses/:courseId')
  @ApiOperation({ summary: 'Course analytics' })
  async getCourseAnalytics(@Param('courseId') courseId: string) {
    return this.analytics.getCourseAnalytics(courseId);
  }

  @Get('users')
  @ApiOperation({ summary: 'My analytics' })
  async getUserAnalytics(@Req() req: any) {
    return this.analytics.getUserAnalytics(req.user.id);
  }

  @Get('system')
  @ApiOperation({ summary: 'System-wide stats (admin)' })
  async getSystemStats() {
    return this.analytics.getSystemStats();
  }

  @Get('admin/users/:userId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Learner analytics for admin/staff' })
  async getAdminUserAnalytics(@Param('userId') userId: string) {
    return this.analytics.getUserAnalytics(userId);
  }
}
