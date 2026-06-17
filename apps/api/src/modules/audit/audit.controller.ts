import { Controller, Get, Post, Param, Query, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditLogService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Audit Logs')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'platform_super_admin')
@ApiBearerAuth()
export class AuditLogController {
  constructor(private readonly audit: AuditLogService) {}

  @Get()
  @ApiOperation({ summary: 'List audit log entries' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('action') action?: string,
    @Query('entity') entity?: string,
  ) {
    return this.audit.findAll({ page, limit, search, action, entity });
  }

  @Get('actions')
  @ApiOperation({ summary: 'Get unique action types' })
  async getActions() {
    return this.audit.getUniqueActions();
  }

  @Post(':id/revert')
  @Roles('platform_super_admin')
  @ApiOperation({ summary: 'Revert an audit log entry (super admin only)' })
  async revert(@Param('id') id: string, @Req() req: any) {
    return this.audit.revert(id, req.user.id);
  }
}
