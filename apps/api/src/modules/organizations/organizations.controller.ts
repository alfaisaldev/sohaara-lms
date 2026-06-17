import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Organizations')
@Controller('organizations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrganizationsController {
  constructor(private readonly orgService: OrganizationsService) {}

  @Public()
  @Get('invite/:token')
  @ApiOperation({ summary: 'Get organization by invite token (public)' })
  async findByInviteToken(@Param('token') token: string) {
    return this.orgService.findByInviteToken(token);
  }

  @Get()
  @ApiOperation({ summary: 'List all organizations' })
  async findAll(@Query('page') page?: number, @Query('limit') limit?: number, @Query('search') search?: string) {
    return this.orgService.findAll({ page, limit, search });
  }

  @Get(':id/invite-token')
  @ApiOperation({ summary: 'Get encrypted invite token for an organization' })
  async getInviteToken(@Param('id') id: string) {
    const token = this.orgService.getInviteToken(id);
    return { token };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get organization by ID' })
  async findById(@Param('id') id: string) {
    return this.orgService.findById(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'platform_super_admin')
  @ApiOperation({ summary: 'Create organization' })
  async create(@Body() body: { name: string; slug: string; description?: string; email?: string; website?: string }) {
    return this.orgService.create(body);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'platform_super_admin')
  @ApiOperation({ summary: 'Update organization' })
  async update(@Param('id') id: string, @Body() body: any) {
    return this.orgService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'platform_super_admin')
  @ApiOperation({ summary: 'Delete organization' })
  async delete(@Param('id') id: string) {
    return this.orgService.delete(id);
  }

  @Get(':id/departments')
  @ApiOperation({ summary: 'Get departments' })
  async getDepartments(@Param('id') id: string) {
    return this.orgService.getDepartments(id);
  }

  @Post(':id/departments')
  @UseGuards(RolesGuard)
  @Roles('admin', 'platform_super_admin')
  @ApiOperation({ summary: 'Create department' })
  async createDepartment(@Param('id') id: string, @Body() body: any) {
    return this.orgService.createDepartment(id, body);
  }

  @Get(':id/teams')
  @ApiOperation({ summary: 'Get teams' })
  async getTeams(@Param('id') id: string) {
    return this.orgService.getTeams(id);
  }

  @Post(':id/teams')
  @UseGuards(RolesGuard)
  @Roles('admin', 'platform_super_admin')
  @ApiOperation({ summary: 'Create team' })
  async createTeam(@Param('id') id: string, @Body() body: any) {
    return this.orgService.createTeam(id, body);
  }

  @Get(':id/groups')
  @ApiOperation({ summary: 'Get groups' })
  async getGroups(@Param('id') id: string) {
    return this.orgService.getGroups(id);
  }

  @Post(':id/groups')
  @UseGuards(RolesGuard)
  @Roles('admin', 'platform_super_admin')
  @ApiOperation({ summary: 'Create group' })
  async createGroup(@Param('id') id: string, @Body() body: any) {
    return this.orgService.createGroup(id, body);
  }

  @Put(':id/assign-courses')
  @UseGuards(RolesGuard)
  @Roles('admin', 'platform_super_admin')
  @ApiOperation({ summary: 'Assign courses to this organization' })
  async assignCourses(@Param('id') id: string, @Body() body: { courseIds: string[] }) {
    return this.orgService.assignCourses(id, body.courseIds);
  }

  @Put(':id/assign-learning-paths')
  @UseGuards(RolesGuard)
  @Roles('admin', 'platform_super_admin')
  @ApiOperation({ summary: 'Assign learning paths to this organization' })
  async assignLearningPaths(@Param('id') id: string, @Body() body: { learningPathIds: string[] }) {
    return this.orgService.assignLearningPaths(id, body.learningPathIds);
  }
}
