import { PrismaClient } from '@prisma/client';
import * as bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

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

  const slugsToRemove = ['organization_admin', 'manager', 'instructor', 'teaching_assistant'];
  for (const slug of slugsToRemove) {
    const r = await prisma.role.findFirst({ where: { slug, organizationId: null } });
    if (r) {
      await prisma.role.delete({ where: { id: r.id } });
      console.log(`  ✗ Role removed: ${r.name}`);
    }
  }

  // Create roles (only keeping: Platform Super Admin, Admin, Content Manager, Learner)
  const roles = [
    { name: 'Platform Super Admin', slug: 'platform_super_admin', isSystem: true, permissions: ['*'] },
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
    const passwordHash = await bcryptjs.hash('Admin123!', 12);
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

    const superAdminRole = await prisma.role.findFirst({ where: { slug: 'platform_super_admin' } });
    if (superAdminRole) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: superAdminRole.id,
          assignedBy: user.id,
        },
      });
    }

    console.log('  ✓ Super admin created: admin@sohaara.com / Admin123!');
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
