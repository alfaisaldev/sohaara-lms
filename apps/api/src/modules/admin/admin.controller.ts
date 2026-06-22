import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

/**
 * Admin-panel user-management proxy.
 *
 * Every endpoint here delegates the identity-side work to
 * {@link AdminService} → {@link KeycloakAdminService}. The browser
 * **never** calls the Keycloak Admin REST API directly — it always
 * goes through these `/api/v1/admin/...` endpoints so:
 *
 *   - the bootstrap `admin-cli` service-account token stays in the
 *     api container (never in the browser's JS bundle or localStorage),
 *   - the `RolesGuard` enforces that only `super_admin` / `admin` can
 *     call these endpoints,
 *   - LMS-side writes (User row, SocialAccount link, audit log) stay
 *     consistent with the Keycloak-side state.
 */
@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('super_admin', 'admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * List + search users. Joins Keycloak (auth/identity) with the LMS
   * `User` table (profile).
   */
  @Get('users')
  @ApiOperation({ summary: 'List + search users (admin)' })
  async listUsers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.adminService.listUsers({ page, limit, search });
  }

  /**
   * Create a user. The new user is provisioned in Keycloak (with
   * `actions=[UPDATE_PASSWORD]` so Keycloak emails them a set-password
   * link), then mirrored in the LMS `User` table.
   *
   * Body shape:
   *   {
   *     email: string,
   *     firstName: string,
   *     lastName: string,
   *     enabled?: boolean,            // default true
   *     sendPasswordReset?: boolean,   // default true
   *     organizationId?: string,       // optional, attaches user to an org
   *   }
   */
  @Post('users')
  @ApiOperation({ summary: 'Create a user (admin)' })
  async createUser(@Body() body: {
    email: string;
    firstName: string;
    lastName: string;
    enabled?: boolean;
    sendPasswordReset?: boolean;
    organizationId?: string;
  }) {
    return this.adminService.createUser(body || {});
  }

  /**
   * Assign (replace) the user's realm roles. Roles are stored in
   * Keycloak — the LMS does not duplicate this state.
   *
   * Body: `{ roles: string[] }` — full desired set; omitted roles
   * are removed.
   */
  @Post('users/:id/roles')
  @ApiOperation({ summary: 'Assign / replace realm roles for a user' })
  async assignRoles(@Param('id') id: string, @Body() body: { roles: string[] }) {
    return this.adminService.setUserRoles(id, body?.roles || []);
  }

  /**
   * Disable a user account. Sets `enabled=false` in Keycloak and
   * `status='inactive'` in the LMS `User` row. Existing sessions are
   * revoked by Keycloak.
   */
  @Post('users/:id/disable')
  @ApiOperation({ summary: 'Disable a user account' })
  async disableUser(@Param('id') id: string) {
    return this.adminService.disableUser(id);
  }

  /**
   * Re-enable a previously disabled user.
   */
  @Post('users/:id/enable')
  @ApiOperation({ summary: 'Re-enable a user account' })
  async enableUser(@Param('id') id: string) {
    return this.adminService.enableUser(id);
  }

  /**
   * Re-send the "set your password" email via Keycloak's themed
   * `sohaara` email template.
   */
  @Post('users/:id/send-reset')
  @ApiOperation({ summary: 'Send a set-password email to the user' })
  async sendReset(@Param('id') id: string) {
    return this.adminService.sendPasswordReset(id);
  }
}
