import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

/**
 * Helper — same shape as `auth.controller.ts#gone()`. Used to 410 the
 * legacy user-management routes that bypassed Keycloak. Under Model A+,
 * user creation + role assignment + enable/disable + reset all go
 * through the Keycloak admin proxy at `/api/v1/admin/users`.
 */
function gone(replacement: string): never {
  throw new HttpException(
    {
      statusCode: HttpStatus.GONE,
      error: 'Gone',
      message:
        'This legacy user-management route is no longer supported. Under ' +
        'Model A+, Keycloak owns identity + roles. Use the Keycloak admin ' +
        'proxy at /api/v1/admin/users for create / list / setRoles / ' +
        'enable / disable / send-reset.',
      replacement,
    },
    HttpStatus.GONE,
  );
}

/**
 * Roles allowed to LIST or READ LMS user rows. Read-only access to
 * the local User table is still useful for the admin panel and for
 * analytics, but it must NOT be open to every authenticated user
 * (it used to be — that let any learner see the full user list).
 */
const READ_ROLES = ['super_admin', 'admin', 'content_manager'];

/**
 * NOTE: there is intentionally NO class-level `@UseGuards` here.
 * The legacy 410-Gone stubs need to be reachable by ANY caller
 * (including unauthenticated) so the 410 signal lands on the wire.
 * A class-level `@UseGuards(JwtAuthGuard)` would intercept those
 * calls first and return 401, masking the 410 (the same bug
 * `POST /auth/change-password` had). Guards are now applied per-
 * method to the routes that actually need them.
 */
@ApiTags('Users')
@Controller('users')
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * @deprecated Use `POST /api/v1/admin/users` (Keycloak admin proxy).
   * The legacy path used to bcrypt-hash a password on the LMS side,
   * which violates "LMS never sees, stores, transmits, logs, or hashes
   * a password". 410 Gone.
   */
  @Post()
  @ApiOperation({ summary: '[DEPRECATED] Legacy user create — returns 410 Gone' })
  async create(@Body() _body: { firstName: string; lastName: string; email: string; password?: string; isActive?: boolean }) {
    gone('/api/v1/admin/users');
  }

  /**
   * @deprecated Use `POST /api/v1/admin/users/:id/roles` (Keycloak
   * admin proxy, which diff-syncs the realm). The legacy route wrote
   * to a local `user_roles` table — Keycloak never saw the change,
   * so the user would still appear with their old roles on the next
   * login. 410 Gone.
   */
  @Post(':id/roles')
  @ApiOperation({ summary: '[DEPRECATED] Legacy assign role — returns 410 Gone' })
  async assignRole(@Param('id') _id: string, @Body() _body: { roleId: string }) {
    gone(`/api/v1/admin/users/${_id}/roles`);
  }

  /**
   * @deprecated Use `POST /api/v1/admin/users/:id/roles` (Keycloak
   * admin proxy with the new roles list — diff-removes the omitted
   * ones). 410 Gone.
   */
  @Delete(':id/roles/:roleId')
  @ApiOperation({ summary: '[DEPRECATED] Legacy remove role — returns 410 Gone' })
  async removeRole(@Param('id') _id: string, @Param('roleId') _roleId: string) {
    gone(`/api/v1/admin/users/${_id}/roles`);
  }

  /**
   * @deprecated Use `GET /api/v1/admin/users` — it includes the
   * user's realm roles from Keycloak. The legacy local-table read
   * is misleading now that Keycloak is the source of truth. 410
   * Gone.
   */
  @Get(':id/roles')
  @ApiOperation({ summary: '[DEPRECATED] Legacy get roles — returns 410 Gone' })
  async getRoles(@Param('id') _id: string) {
    gone(`/api/v1/admin/users`);
  }

  // ─── Authenticated routes (per-method guards) ──────────────────

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...READ_ROLES)
  @ApiOperation({ summary: 'List all users (admin / content_manager)' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.usersService.findAll({ page, limit, search, organizationId });
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...READ_ROLES)
  @ApiOperation({ summary: 'Get user by ID (admin / content_manager)' })
  async findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @ApiOperation({ summary: 'Update user (super admin only)' })
  async update(@Param('id') id: string, @Body() body: any) {
    return this.usersService.update(id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Delete user (soft)' })
  async delete(@Param('id') id: string, @Req() req: any) {
    return this.usersService.delete(id, req.user.id);
  }

  @Get(':id/profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...READ_ROLES)
  @ApiOperation({ summary: 'Get user profile (admin / content_manager)' })
  async getProfile(@Param('id') id: string) {
    return this.usersService.getProfile(id);
  }

  @Put(':id/profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  @ApiOperation({ summary: 'Update user profile (super admin only)' })
  async updateProfile(@Param('id') id: string, @Body() body: any) {
    return this.usersService.updateProfile(id, body);
  }
}