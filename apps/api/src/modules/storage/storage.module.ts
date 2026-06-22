import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '../config/config.module';
import { StorageRouterService } from './storage-router.service';

/**
 * The api has three MinIO buckets (one per logical purpose):
 *   - `sohaara-uploads`      — Media Library, avatars
 *   - `sohaara-scorm`        — extracted SCORM package contents
 *   - `sohaara-certificates` — certificate template backgrounds and logos
 *
 * The key convention in the database URL encodes which bucket a file lives
 * in: `<type>/...` is enough to route the read. `StorageRouterService` is
 * the only place that knows this mapping, so the read-side controller route
 * (`GET /uploads/*`) can serve files from any of the three buckets without
 * caring which provider wrote them.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [StorageRouterService],
  exports: [StorageRouterService],
})
export class StorageModule {}
