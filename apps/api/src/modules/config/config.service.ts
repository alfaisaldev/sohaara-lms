import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigService {
  get nodeEnv(): string {
    return process.env.NODE_ENV || 'development';
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get jwtSecret(): string {
    return process.env.JWT_SECRET || 'dev-jwt-secret';
  }

  get jwtExpiresIn(): string {
    return process.env.JWT_EXPIRES_IN || '15m';
  }

  get jwtRefreshExpiresIn(): string {
    return process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  }

  get jwtIssuer(): string {
    return process.env.JWT_ISSUER || 'sohaara-lms';
  }

  get databaseUrl(): string {
    return process.env.DATABASE_URL || 'postgresql://sohaara:sohaara@localhost:5432/sohaara_lms?schema=public';
  }

  get redisUrl(): string {
    return process.env.REDIS_URL || 'redis://localhost:6379';
  }

  get appUrl(): string {
    return process.env.APP_URL || 'http://localhost:3000';
  }

  get adminUrl(): string {
    return process.env.ADMIN_URL || 'http://localhost:3001';
  }

  get apiUrl(): string {
    return process.env.API_URL || 'http://localhost:4000';
  }

  get storageProvider(): 'local' | 's3' | 'minio' {
    const v = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();
    return (v === 's3' || v === 'minio') ? v : 'local';
  }

  get authProvider(): 'local' | 'keycloak' {
    const v = (process.env.AUTH_PROVIDER || 'local').toLowerCase();
    return v === 'keycloak' ? 'keycloak' : 'local';
  }

  get keycloakUrl(): string {
    return process.env.KEYCLOAK_URL || 'http://localhost:8080';
  }

  get keycloakRealm(): string {
    return process.env.KEYCLOAK_REALM || 'sohaara';
  }

  get keycloakClientId(): string {
    return process.env.KEYCLOAK_CLIENT_ID || 'sohaara-api';
  }

  /**
   * Client secret for the bearerOnly `sohaara-api` client, if any.
   * Public PKCE clients don't need a secret; this is here for the
   * `client_credentials` direct-grant callers (mobile, CLI). The web
   * and admin apps don't use this value — they speak to Keycloak
   * directly through the browser OIDC flow.
   */
  get keycloakClientSecret(): string {
    return process.env.KEYCLOAK_CLIENT_SECRET || 'sohaara-api-secret-change-me';
  }

  /**
   * OIDC issuer URL for the configured Keycloak realm, from the
   * **inside the docker network** (e.g.
   * `http://emu-keycloak:8080/realms/sohaara`). This is what the api
   * uses to fetch the JWKS and to build the `iss` claim it stamps on
   * any tokens it itself mints.
   *
   * For **verifying** the `iss` of an incoming bearer or exchange
   * token, use {@link keycloakAcceptableIssuers} — the token's `iss`
   * will be the form the user (or their browser) saw, which can be
   * `http://localhost:8080/realms/sohaara` (host-port-forward) or
   * `http://emu-keycloak:8080/realms/sohaara` (docker-internal) or
   * the realm's public hostname, depending on who minted the token.
   */
  get keycloakIssuer(): string {
    return `${this.keycloakUrl.replace(/\/+$/, '')}/realms/${this.keycloakRealm}`;
  }

  /**
   * Issuer URL the realm exposes to **outside** clients (host browsers,
   * curl, the web app running in a browser). Defaults to
   * `http://localhost:8080/realms/<realm>` — i.e. Keycloak reached
   * through the host port-forward — but can be overridden with
   * `KEYCLOAK_PUBLIC_URL` for deployments where Keycloak is on a
   * real hostname.
   */
  get keycloakPublicUrl(): string {
    return process.env.KEYCLOAK_PUBLIC_URL || 'http://localhost:8080';
  }

  /**
   * Public issuer URL with the realm path appended. Tokens minted
   * from a host browser will carry this as their `iss` claim.
   */
  get keycloakPublicIssuer(): string {
    return `${this.keycloakPublicUrl.replace(/\/+$/, '')}/realms/${this.keycloakRealm}`;
  }

  /**
   * Set of issuer URLs the api will accept on a Keycloak-issued
   * access_token. Includes the internal docker hostname, the public
   * host-port-forward form, and the public URL form (in case the
   * realm is published under a real hostname). All entries are
   * normalised to remove a trailing slash for direct string compare.
   */
  get keycloakAcceptableIssuers(): Set<string> {
    const issuers = new Set<string>();
    const add = (u: string) => {
      const norm = u.replace(/\/+$/, '');
      if (norm) issuers.add(norm);
    };
    add(this.keycloakIssuer);
    add(this.keycloakPublicIssuer);
    // Bare `KEYCLOAK_URL` (no realm path) form, just in case a token
    // was minted against a misconfigured realm that uses the base
    // URL as its issuer.
    add(this.keycloakUrl);
    add(this.keycloakPublicUrl);
    return issuers;
  }

  /**
   * JWKS endpoint for the configured realm. The JWT strategy fetches the
   * realm's public keys from here to verify RS256 signatures on Keycloak-
   * issued tokens.
   */
  get keycloakJwksUri(): string {
    return `${this.keycloakIssuer}/protocol/openid-connect/certs`;
  }

  // ─── Keycloak Admin REST API (bootstrap) ──────────────────────────────
  // The LMS uses the realm's built-in `admin-cli` client + resource-owner
  // password grant to mint short-lived bearer tokens for talking to the
  // `/admin/realms/<realm>/...` REST API. See KeycloakAdminService for the
  // bootstrap pattern and the security model.

  /**
   * Client id used to authenticate the LMS against Keycloak's Admin
   * REST API. Defaults to the dedicated `sohaara-admin-bootstrap`
   * service-account client (created in the realm import with
   * `serviceAccountsEnabled: true`). The legacy `admin-cli` fallback
   * is kept for environments that haven't switched yet.
   */
  get keycloakAdminClientId(): string {
    return process.env.KEYCLOAK_ADMIN_CLIENT_ID || 'sohaara-admin-bootstrap';
  }

  /**
   * Client secret for the `keycloakAdminClientId` confidential
   * client. Used by the `client_credentials` grant in
   * {@link KeycloakAdminService}. The default matches the dev-only
   * secret in `aws-emulator/keycloak/realms/sohaara.json`; override
   * in production via `KEYCLOAK_ADMIN_CLIENT_SECRET`. The env var
   * is server-only — it never reaches the browser bundle.
   */
  get keycloakAdminClientSecret(): string {
    return process.env.KEYCLOAK_ADMIN_CLIENT_SECRET || 'sohaara-admin-bootstrap-secret-change-me';
  }

  /**
   * @deprecated Retained for back-compat with any code that still
   * reads these. The `client_credentials` flow against
   * `sohaara-admin-bootstrap` does not use a username/password —
   * the client secret alone is the credential. The setters here
   * are no-ops against the runtime token mint.
   */
  get keycloakAdminUsername(): string {
    return process.env.KEYCLOAK_ADMIN_USERNAME || process.env.KEYCLOAK_ADMIN || 'admin';
  }

  /** @deprecated See {@link keycloakAdminUsername}. */
  get keycloakAdminPassword(): string {
    return process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin';
  }

  /**
   * How long an Admin REST bearer token should be cached in-process
   * before being refreshed. Defaults to 5 minutes (300000 ms) — well
   * under Keycloak's default access-token lifetime (5–15 min) and
   * long enough to absorb a burst of admin-panel calls without
   * hitting Keycloak on every request.
   */
  get keycloakAdminTokenTtlMs(): number {
    const raw = parseInt(process.env.KEYCLOAK_ADMIN_TOKEN_TTL_MS || '300000', 10);
    return Number.isFinite(raw) && raw > 0 ? raw : 300000;
  }

  get meilisearchUrl(): string {
    return process.env.MEILISEARCH_URL || 'http://localhost:7700';
  }

  get meilisearchKey(): string {
    return process.env.MEILISEARCH_KEY || 'sohaara-master-key';
  }

  get minioEndpoint(): string {
    return process.env.MINIO_ENDPOINT || 'localhost';
  }

  get minioPort(): number {
    return parseInt(process.env.MINIO_PORT || '9000', 10);
  }

  get minioAccessKey(): string {
    return process.env.MINIO_ACCESS_KEY || 'sohaara';
  }

  get minioSecretKey(): string {
    return process.env.MINIO_SECRET_KEY || 'sohaara-secret-key';
  }

  get minioBucket(): string {
    // Kept for back-compat. The api now uses the per-purpose getters below
    // so each call site can target the right bucket without an env var
    // dance. The emulator's minio-init.sh creates these buckets:
    //   sohaara-uploads, sohaara-media, sohaara-scorm, sohaara-certificates,
    //   sohaara-backups
    return process.env.MINIO_BUCKET || 'sohaara-uploads';
  }

  /** Bucket for Media Library uploads (images, docs, videos, avatars). */
  get minioBucketUploads(): string {
    return process.env.MINIO_BUCKET_UPLOADS || 'sohaara-uploads';
  }

  /** Bucket for extracted SCORM package contents. */
  get minioBucketScorm(): string {
    return process.env.MINIO_BUCKET_SCORM || 'sohaara-scorm';
  }

  /** Bucket for certificate template backgrounds and logos. */
  get minioBucketCertificates(): string {
    return process.env.MINIO_BUCKET_CERTIFICATES || 'sohaara-certificates';
  }

  /** Bucket for public-read media assets (e.g. course thumbnails). */
  get minioBucketMedia(): string {
    return process.env.MINIO_BUCKET_MEDIA || 'sohaara-media';
  }

  get minioUseSsl(): boolean {
    return process.env.MINIO_USE_SSL === 'true';
  }

  /**
   * Public URL prefix used when building browser-facing URLs for stored
   * objects. Defaults to `${apiUrl}/uploads` so the existing `useStaticAssets`
   * route (and the new streaming controller) can serve the bytes. In a
   * production S3 + CloudFront setup this would be `https://cdn.example.com`.
   */
  get storagePublicUrl(): string {
    return process.env.STORAGE_PUBLIC_URL || `${this.apiUrl}/uploads`;
  }
}
