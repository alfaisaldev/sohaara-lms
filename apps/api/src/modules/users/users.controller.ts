import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'content_manager')
  @ApiOperation({ summary: 'Create a user (admin)' })
  async create(@Body() body: { firstName: string; lastName: string; email: string; password?: string; isActive?: boolean }) {
    return this.usersService.create(body);
  }

  @Get()
  @ApiOperation({ summary: 'List all users' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.usersService.findAll({ page, limit, search, organizationId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  async findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('platform_super_admin')
  @ApiOperation({ summary: 'Update user (super admin only)' })
  async update(@Param('id') id: string, @Body() body: any) {
    return this.usersService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Delete user (soft)' })
  async delete(@Param('id') id: string, @Req() req: any) {
    return this.usersService.delete(id, req.user.id);
  }

  @Get(':id/profile')
  @ApiOperation({ summary: 'Get user profile' })
  async getProfile(@Param('id') id: string) {
    return this.usersService.getProfile(id);
  }

  @Put(':id/profile')
  @UseGuards(RolesGuard)
  @Roles('platform_super_admin')
  @ApiOperation({ summary: 'Update user profile (super admin only)' })
  async updateProfile(@Param('id') id: string, @Body() body: any) {
    return this.usersService.updateProfile(id, body);
  }

  @Get(':id/roles')
  @ApiOperation({ summary: 'Get user roles' })
  async getRoles(@Param('id') id: string) {
    return this.usersService.getRoles(id);
  }

  @Post(':id/roles')
  @UseGuards(RolesGuard)
  @Roles('platform_super_admin')
  @ApiOperation({ summary: 'Assign role to user (super admin only)' })
  async assignRole(@Param('id') id: string, @Body() body: { roleId: string }, @Req() req: any) {
    return this.usersService.assignRole(id, body.roleId, req.user.id);
  }

  @Delete(':id/roles/:roleId')
  @UseGuards(RolesGuard)
  @Roles('platform_super_admin')
  @ApiOperation({ summary: 'Remove role from user (super admin only)' })
  async removeRole(@Param('id') id: string, @Param('roleId') roleId: string) {
    return this.usersService.removeRole(id, roleId);
  }
}
