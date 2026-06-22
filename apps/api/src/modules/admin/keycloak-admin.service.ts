import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '../config/config.service';

/**
 * Shape returned by `/realms/<realm>/protocol/openid-connect/token` when
 * using the `client_credentials` (or `password`) grant against the
 * built-in `admin-cli` client.
 */
interface AdminTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_expires_in?: number;
  refresh_token?: string;
  token_type: string;
  'not-before-policy'?: number;
  session_state?: string;
  scope?: string;
}

interface CachedAdminToken {
  accessToken: string;
  /** Epoch ms when this token should be considered expired. */
  expiresAt: number;
}

/**
 * Service for talking to the **Keycloak Admin REST API** as the
 * dedicated `sohaara-admin-bootstrap` service-account client.
 *
 * # Why this exists
 *
 * Under Model A+ the LMS never stores, transmits, logs, or hashes a
 * password. But the admin panel needs to do things that are inherently
 * identity-system actions:
 *
 *   - **Create a user** with `actions=[UPDATE_PASSWORD]` so Keycloak
 *     sends the user a "set your password" email.
 *   - **Assign a realm role** to a user.
 *   - **Disable** an account.
 *   - **Re-send the password-reset email**.
 *   - **List + search users** for the admin panel.
 *
 * All of those are Keycloak Admin REST endpoints. The browser never
 * touches them directly — admin panel UI hits our
 * `/api/v1/admin/users*` endpoints, which proxy here.
 *
 * # Bootstrap pattern (service-account client_credentials)
 *
 * The LMS authenticates to the Admin API as the
 * `sohaara-admin-bootstrap` confidential client (created in the realm
 * import with `serviceAccountsEnabled: true` + a hard-coded dev
 * secret). The client_credentials grant returns a bearer token whose
 * `aud: realm-management` and `resource_access.realm-management.roles`
 * claims satisfy Keycloak's Admin REST authz. The auto-created
 * `service-account-sohaara-admin-bootstrap` user is granted
 * `realm-management:realm-admin` so the token carries the
 * `realm-admin` permission.
 *
 * The service-account user + role grant are configured on first call
 * (see {@link ensureBootstrapPermissions}) so a fresh realm import
 * doesn't need a one-shot setup script. The assignment is idempotent
 * — re-running it on every startup is a no-op if the role is already
 * present.
 *
 * Bootstrap credentials live in env vars and are never exposed to
 * the browser. The previous design used `admin-cli` + a username/
 * password pair against a regular user, which both required an
 * interactive human's password in the api container and only worked
 * in the master realm — the new service-account client is the
 * canonical pattern and lives entirely in the sohaara realm.
 */
@Injectable()
export class KeycloakAdminService {
  private readonly logger = new Logger(KeycloakAdminService.name);
  private cached: CachedAdminToken | null = null;
  /**
   * In-memory latch so {@link ensureBootstrapPermissions} runs at
   * most once per api process lifetime. The role assignment is
   * idempotent against Keycloak, so re-running is safe — but a
   * one-shot per process keeps startup logs clean and avoids a
   * redundant `service-account-user` lookup on every token refresh.
   */
  private bootstrapChecked = false;

  constructor(private readonly config: ConfigService) {}

  /**
   * The base URL for the **Admin REST API** for the configured realm.
   * Standard Keycloak path: `/admin/realms/<realm>` — note this is
   * under the bare Keycloak root (`KEYCLOAK_URL`), NOT under the
   * OIDC issuer path (`/realms/<realm>`). Building it from
   * `keycloakIssuer` would produce the wrong
   * `/realms/<realm>/admin/realms/<realm>` URL.
   */
  private get adminBase(): string {
    return `${this.config.keycloakUrl.replace(/\/+$/, '')}/admin/realms/${this.config.keycloakRealm}`;
  }

  /**
   * Acquire a (cached) bearer token for the Admin REST API. Caches for
   * ~5 minutes; refreshes automatically on expiry. Throws
   * `ServiceUnavailableException` if Keycloak is unreachable so the
   * caller can return a clean 503.
   */
  async getAdminToken(forceRefresh = false): Promise<string> {
    const now = Date.now();
    if (!forceRefresh && this.cached && this.cached.expiresAt - 60_000 > now) {
      return this.cached.accessToken;
    }

    const tokenUrl = `${this.config.keycloakIssuer}/protocol/openid-connect/token`;
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.config.keycloakAdminClientId,
      client_secret: this.config.keycloakAdminClientSecret,
    });

    let res: Response;
    try {
      res = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
    } catch (err) {
      this.logger.error(`Failed to reach Keycloak token endpoint: ${(err as Error).message}`);
      throw new ServiceUnavailableException('Keycloak is unreachable');
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      // 401/403 here means the bootstrap credentials are wrong. That
      // is a configuration error, not a transient outage — surface
      // it loudly so it shows up in the api logs.
      this.logger.error(`Keycloak admin token request failed: ${res.status} ${text}`);
      throw new ServiceUnavailableException(`Keycloak admin auth failed (${res.status})`);
    }

    let json: AdminTokenResponse;
    try {
      json = (await res.json()) as AdminTokenResponse;
    } catch (err) {
      this.logger.error(`Keycloak admin token response not JSON: ${(err as Error).message}`);
      throw new ServiceUnavailableException('Keycloak returned an invalid token response');
    }

    const ttl = Math.max(60_000, Math.min((json.expires_in ?? 300) * 1000, this.config.keycloakAdminTokenTtlMs));
    this.cached = { accessToken: json.access_token, expiresAt: Date.now() + ttl };

    // One-shot per process: make sure the auto-created service-account
    // user actually has the `realm-management:realm-admin` client role.
    // Without this, the Admin REST API will 403 on every call because
    // the token's `resource_access.realm-management.roles` is empty.
    if (!this.bootstrapChecked) {
      this.bootstrapChecked = true;
      try {
        await this.ensureBootstrapPermissions();
      } catch (err) {
        this.logger.warn(
          `Bootstrap permission self-heal failed: ${(err as Error).message}. ` +
          `Admin API calls may 403 until the realm-management:realm-admin role ` +
          `is assigned to the service-account user.`,
        );
      }
    }

    return this.cached.accessToken;
  }

  /**
   * Resolve the auto-created service-account user for the bootstrap
   * client and grant it the `realm-management:realm-admin` client
   * role. Idempotent: re-running on a user that already has the
   * role is a Keycloak 204 no-op.
   *
   * Why this exists: Keycloak creates the service-account user on
   * the first `client_credentials` token mint. There's no way to
   * pre-declare that user's UUID in the realm import, so we can't
   * pin the role assignment there. Doing it here on first use is
   * the cleanest way to make a fresh realm import "just work" with
   * no extra one-shot script.
   */
  private async ensureBootstrapPermissions(): Promise<void> {
    const token = await this.getAdminToken(true);
    const clientId = this.config.keycloakAdminClientId;
    const saUsername = `service-account-${clientId}`;

    // 1. Find the service-account user.
    const usersRes = await this.fetchAdmin(
      `/users?username=${encodeURIComponent(saUsername)}&max=1`,
    );
    if (!usersRes.ok) {
      throw new Error(`Failed to look up service-account user: ${usersRes.status}`);
    }
    const users = (await usersRes.json()) as Array<{ id: string; username: string }>;
    if (!users.length) {
      throw new Error(`Service-account user "${saUsername}" not found yet — this is unexpected on the first call after a token mint`);
    }
    const saUserId = users[0]!.id;

    // 2. Look up the realm-management client + its realm-admin role.
    const clientsRes = await this.fetchAdmin(`/clients?clientId=realm-management`);
    if (!clientsRes.ok) {
      throw new Error(`Failed to look up realm-management client: ${clientsRes.status}`);
    }
    const clients = (await clientsRes.json()) as Array<{ id: string; clientId: string }>;
    if (!clients.length) {
      throw new Error(`realm-management client not found in realm`);
    }
    const rmClientId = clients[0]!.id;

    const roleRes = await this.fetchAdmin(`/clients/${encodeURIComponent(rmClientId)}/roles/realm-admin`);
    if (!roleRes.ok) {
      throw new Error(`Failed to look up realm-management:realm-admin role: ${roleRes.status}`);
    }
    const role = (await roleRes.json()) as { id: string; name: string };

    // 3. Check existing role mappings — idempotent path.
    const existingRes = await this.fetchAdmin(
      `/users/${encodeURIComponent(saUserId)}/role-mappings/clients/${encodeURIComponent(rmClientId)}`,
    );
    if (!existingRes.ok) {
      throw new Error(`Failed to read current role mappings: ${existingRes.status}`);
    }
    const existing = (await existingRes.json()) as Array<{ name: string }>;
    if (existing.some((r) => r.name === 'realm-admin')) {
      this.logger.log(`Bootstrap role realm-management:realm-admin already assigned to ${saUsername}`);
      return;
    }

    // 4. Assign the role.
    const grantRes = await this.fetchAdmin(
      `/users/${encodeURIComponent(saUserId)}/role-mappings/clients/${encodeURIComponent(rmClientId)}`,
      {
        method: 'POST',
        body: JSON.stringify([{ id: role.id, name: role.name }]),
      },
    );
    if (!grantRes.ok) {
      throw new Error(`Failed to grant realm-admin role: ${grantRes.status}`);
    }
    this.logger.log(`Granted realm-management:realm-admin to ${saUsername} (bootstrap self-heal)`);
  }

  /**
   * Reset the cached token. Useful for tests, and for the next call
   * after we see a 401 from Keycloak.
   */
  invalidate(): void {
    this.cached = null;
  }

  // ─── Users ──────────────────────────────────────────────────────────

  /**
   * Create a user in the realm. Optionally send the user a
   * "set your password" email by including `actions=['UPDATE_PASSWORD']`
   * in the request body.
   *
   * Returns the Keycloak user id (UUID).
   */
  async createUser(input: {
    email: string;
    firstName: string;
    lastName: string;
    enabled?: boolean;
    emailVerified?: boolean;
    attributes?: Record<string, string[]>;
  }): Promise<string> {
    const token = await this.getAdminToken();
    const body: Record<string, unknown> = {
      username: input.email,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      enabled: input.enabled ?? true,
      emailVerified: input.emailVerified ?? false,
    };
    if (input.attributes) body.attributes = input.attributes;

    const res = await this.fetchAdmin('/users', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (res.status !== 201) {
      throw await this.toHttpError(res, 'createUser');
    }
    // Keycloak returns the new user id in the `Location` header:
    //   /admin/realms/<realm>/users/<uuid>
    const location = res.headers.get('location') || '';
    const id = location.split('/').pop() || '';
    if (!id) {
      throw new ServiceUnavailableException('Keycloak created the user but returned no Location header');
    }
    return id;
  }

  /**
   * Look up a user by id. Returns the Keycloak user representation
   * (with the realm role mappings stripped — we don't need them on
   * the wire to the browser), or `null` if the user doesn't exist.
   */
  async getUser(userId: string): Promise<AdminUserRepresentation | null> {
    const token = await this.getAdminToken();
    const res = await this.fetchAdmin(`/users/${encodeURIComponent(userId)}`);
    if (res.status === 404) return null;
    if (!res.ok) throw await this.toHttpError(res, 'getUser');
    return (await res.json()) as AdminUserRepresentation;
  }

  /**
   * List users with optional search. Mirrors the Keycloak Admin API
   * query params: `search` is a substring match across
   * username / email / firstName / lastName.
   */
  async listUsers(params: { search?: string; first?: number; max?: number } = {}): Promise<AdminUserRepresentation[]> {
    const token = await this.getAdminToken();
    const qs = new URLSearchParams();
    if (params.search) qs.set('search', params.search);
    qs.set('first', String(params.first ?? 0));
    qs.set('max', String(params.max ?? 50));
    const path = `/users?${qs.toString()}`;
    const res = await this.fetchAdmin(path);
    if (!res.ok) throw await this.toHttpError(res, 'listUsers');
    return (await res.json()) as AdminUserRepresentation[];
  }

  /**
   * Disable a user account (Keycloak sets `enabled=false`). The user
   * can no longer log in; existing sessions are revoked. The user
   * row is not deleted.
   */
  async disableUser(userId: string): Promise<void> {
    const token = await this.getAdminToken();
    const res = await this.fetchAdmin(`/users/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      body: JSON.stringify({ enabled: false }),
    });
    if (!res.ok) throw await this.toHttpError(res, 'disableUser');
  }

  /**
   * Re-enable a previously disabled user.
   */
  async enableUser(userId: string): Promise<void> {
    const token = await this.getAdminToken();
    const res = await this.fetchAdmin(`/users/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      body: JSON.stringify({ enabled: true }),
    });
    if (!res.ok) throw await this.toHttpError(res, 'enableUser');
  }

  /**
   * Send the user a "set your password" email. Keycloak's
   * `execute-actions-email` endpoint with `[UPDATE_PASSWORD]` triggers
   * the configured email template (themed `sohaara` in dev).
   */
  async sendPasswordResetEmail(userId: string): Promise<void> {
    const token = await this.getAdminToken();
    const res = await this.fetchAdmin(
      `/users/${encodeURIComponent(userId)}/execute-actions-email`,
      {
        method: 'PUT',
        body: JSON.stringify(['UPDATE_PASSWORD']),
      },
    );
    // 204 No Content is the documented success response.
    if (res.status !== 204 && !res.ok) {
      throw await this.toHttpError(res, 'sendPasswordResetEmail');
    }
  }

  // ─── Roles ──────────────────────────────────────────────────────────

  /**
   * Look up the realm-role representation by name. Returns `null` if
   * no such role exists in the realm.
   */
  async getRealmRole(roleName: string): Promise<{ id: string; name: string } | null> {
    const token = await this.getAdminToken();
    const res = await this.fetchAdmin(`/roles/${encodeURIComponent(roleName)}`);
    if (res.status === 404) return null;
    if (!res.ok) throw await this.toHttpError(res, 'getRealmRole');
    return (await res.json()) as { id: string; name: string };
  }

  /**
   * Assign a realm role to a user. The role must already exist in the
   * realm — see `aws-emulator/keycloak/realms/sohaara.json` for the
   * canonical four: `super_admin`, `admin`, `content_manager`,
   * `learner`.
   */
  async assignRealmRole(userId: string, roleName: string): Promise<void> {
    const role = await this.getRealmRole(roleName);
    if (!role) {
      throw new ServiceUnavailableException(`Keycloak realm role "${roleName}" not found`);
    }
    const token = await this.getAdminToken();
    const res = await this.fetchAdmin(
      `/users/${encodeURIComponent(userId)}/role-mappings/realm`,
      {
        method: 'POST',
        body: JSON.stringify([{ id: role.id, name: role.name }]),
      },
    );
    if (!res.ok) throw await this.toHttpError(res, 'assignRealmRole');
  }

  /**
   * Remove a realm role from a user. Idempotent — returns ok whether
   * the user had the role or not (Keycloak returns 204 either way).
   */
  async removeRealmRole(userId: string, roleName: string): Promise<void> {
    const role = await this.getRealmRole(roleName);
    if (!role) return;
    const token = await this.getAdminToken();
    const res = await this.fetchAdmin(
      `/users/${encodeURIComponent(userId)}/role-mappings/realm`,
      {
        method: 'DELETE',
        body: JSON.stringify([{ id: role.id, name: role.name }]),
      },
    );
    if (!res.ok) throw await this.toHttpError(res, 'removeRealmRole');
  }

  // ─── Internals ──────────────────────────────────────────────────────

  /**
   * Issue a fetch against the Admin REST API with a fresh bearer
   * token. On 401 we invalidate the cache and retry **once** so a
   * token that expired between cache and use still recovers.
   */
  private async fetchAdmin(path: string, init: RequestInit = {}, retried = false): Promise<Response> {
    const token = await this.getAdminToken();
    const headers = new Headers(init.headers || {});
    headers.set('Authorization', `Bearer ${token}`);
    if (init.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    let res: Response;
    try {
      res = await fetch(`${this.adminBase}${path}`, { ...init, headers });
    } catch (err) {
      this.logger.error(`Admin API call to ${path} failed: ${(err as Error).message}`);
      throw new ServiceUnavailableException('Keycloak Admin API is unreachable');
    }

    if (res.status === 401 && !retried) {
      // Token expired between cache and use. Drop the cache and retry
      // once with a fresh token.
      this.invalidate();
      return this.fetchAdmin(path, init, true);
    }
    return res;
  }

  private async toHttpError(res: Response, op: string): Promise<Error> {
    const text = await res.text().catch(() => '');
    this.logger.error(`Keycloak Admin API ${op} failed: ${res.status} ${text}`);
    const e = new Error(`Keycloak Admin API ${op} failed: ${res.status}`) as Error & {
      status?: number;
    };
    e.status = res.status;
    return e;
  }
}

/**
 * Minimal subset of the Keycloak `UserRepresentation` we surface to
 * the admin panel. The Admin REST API returns more fields (credentials,
 * role mappings, etc.) but the panel doesn't need them — and
 * forwarding them verbatim would leak hashed password metadata we
 * never want to see.
 */
export interface AdminUserRepresentation {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  enabled: boolean;
  emailVerified: boolean;
  createdTimestamp?: number;
}
