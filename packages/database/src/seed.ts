import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

/**
 * Sentinel value written into `User.passwordHash` for users whose
 * identity lives in Keycloak (Model A+). The `kc:` prefix marks the
 * row as a Keycloak-mirrored user; the random hex is unguessable and
 * exists ONLY to satisfy the schema's NOT NULL constraint. The
 * `POST /auth/login` 410 Gone stub never compares against this value.
 */
function kcSentinelHash(): string {
  return `kc:${crypto.randomBytes(48).toString('hex')}`;
}

async function main() {
  console.log('🌱 Seeding database...');

  // Create system settings
  await prisma.systemSetting.upsert({
    where: { key: 'platform_name' },
    update: {},
    create: {
      key: 'platform_name',
      value: '"Sohaara LMS"',
      type: 'string',
      group: 'general',
      description: 'Platform name',
    },
  });

  // Migration: rename the legacy `platform_super_admin` slug to
  // `super_admin` so the DB and the Keycloak realm agree on the
  // canonical role slug. The Keycloak realm already uses
  // `super_admin` (sohaara.json `roles.realm`); the local DB still
  // uses `platform_super_admin` from the original schema. Updating
  // `Role.slug` cascades through `user_roles` automatically because
  // they reference `Role.id`, not `slug`. We rename in-place rather
  // than delete-and-recreate so any existing role assignments
  // survive.
  const legacySuperAdmin = await prisma.role.findFirst({
    where: { slug: 'platform_super_admin', organizationId: null },
  });
  if (legacySuperAdmin) {
    const conflict = await prisma.role.findFirst({
      where: { slug: 'super_admin', organizationId: null },
    });
    if (conflict) {
      // Both rows exist — merge legacy into the conflict row by
      // moving its user_roles over, then delete the legacy row.
      const legacyUserRoles = await prisma.userRole.findMany({
        where: { roleId: legacySuperAdmin.id },
      });
      for (const ur of legacyUserRoles) {
        const existing = await prisma.userRole.findFirst({
          where: { userId: ur.userId, roleId: conflict.id },
        });
        if (!existing) {
          await prisma.userRole.update({
            where: { id: ur.id },
            data: { roleId: conflict.id },
          });
        } else {
          await prisma.userRole.delete({ where: { id: ur.id } });
        }
      }
      await prisma.role.delete({ where: { id: legacySuperAdmin.id } });
      console.log('  ✗ Role merged: Platform Super Admin → Super Admin');
    } else {
      await prisma.role.update({
        where: { id: legacySuperAdmin.id },
        data: { slug: 'super_admin', name: 'Super Admin' },
      });
      console.log('  ✓ Role renamed: platform_super_admin → super_admin');
    }
  }

  const slugsToRemove = ['organization_admin', 'manager', 'instructor', 'teaching_assistant'];
  for (const slug of slugsToRemove) {
    const r = await prisma.role.findFirst({ where: { slug, organizationId: null } });
    if (r) {
      await prisma.role.delete({ where: { id: r.id } });
      console.log(`  ✗ Role removed: ${r.name}`);
    }
  }

  // Create roles (only keeping: Super Admin, Admin, Content Manager, Learner).
  // Slugs must match Keycloak realm role names exactly so the
  // `realm_access.roles` claim from the JWT maps 1:1 to these slugs.
  const roles = [
    { name: 'Super Admin', slug: 'super_admin', isSystem: true, permissions: ['*'] },
    { name: 'Admin', slug: 'admin', isSystem: true, permissions: ['*'] },
    { name: 'Content Manager', slug: 'content_manager', isSystem: true, permissions: ['course:*', 'learning-path:*', 'user:read', 'enrollment:*', 'progress:*', 'discussion:write'] },
    { name: 'Learner', slug: 'learner', isSystem: true, permissions: ['course:enroll', 'course:read', 'lesson:read', 'lesson:complete', 'quiz:attempt', 'assignment:submit'] },
  ];

  for (const role of roles) {
    const existing = await prisma.role.findFirst({ where: { slug: role.slug, organizationId: null } });
    if (!existing) {
      await prisma.role.create({ data: role });
      console.log(`  ✓ Role created: ${role.name}`);
    }
  }

  // Create super admin user
  const adminEmail = 'admin@sohaara.com';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    // Under Model A+ we never bcrypt-hash a password on the LMS side.
    // The local `User.passwordHash` field is NOT NULL — we write a
    // random `kc:<hex>` sentinel (same shape as AdminService.createUser
    // and AuthService.ensureKeycloakUser) that can never authenticate
    // via the legacy `POST /auth/login` 410 Gone stub. The actual
    // password lives in Keycloak; the operator must create the same
    // email in the sohaara realm and assign the `super_admin` realm
    // role (e.g. via the admin panel, or via
    // `aws-emulator/keycloak/scripts/seed-admin-user.sh`).
    const passwordHash = kcSentinelHash();
    const user = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        firstName: 'Super',
        lastName: 'Admin',
        emailVerified: true,
        status: 'active',
      },
    });

    const superAdminRole = await prisma.role.findFirst({ where: { slug: 'super_admin' } });
    if (superAdminRole) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: superAdminRole.id,
          assignedBy: user.id,
        },
      });
    }

    // Print a non-secret credential notice. The actual password is
    // set in Keycloak, not here.
    console.log('  ✓ Local super-admin user row created (id matches a Keycloak user that the operator must create separately — see aws-emulator/keycloak/scripts/seed-admin-user.sh).');
  }

  // Create feature flags
  const features = [
    { name: 'AI Course Assistant', key: 'ai_course_assistant', enabled: true },
    { name: 'AI Learning Coach', key: 'ai_learning_coach', enabled: true },
    { name: 'Certificates', key: 'certificates', enabled: true },
    { name: 'Learning Paths', key: 'learning_paths', enabled: true },
    { name: 'Community', key: 'community', enabled: true },
    { name: 'Skills Framework', key: 'skills_framework', enabled: true },
    { name: 'Compliance Training', key: 'compliance_training', enabled: true },
    { name: 'Blog', key: 'blog', enabled: true },
    { name: 'Analytics', key: 'analytics', enabled: true },
    { name: 'Video Streaming', key: 'video_streaming', enabled: true },
  ];

  for (const feature of features) {
    await prisma.featureFlag.upsert({
      where: { key: feature.key },
      update: { enabled: feature.enabled },
      create: { ...feature, enabled: feature.enabled! },
    });
  }

  console.log('  ✓ Feature flags created');
  console.log('✅ Seeding complete');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
