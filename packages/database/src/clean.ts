import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clean() {
  console.log('🧹 Cleaning database...');

  const tablenames = Object.keys(prisma).filter(
    (key) => !key.startsWith('_') && !key.startsWith('$') && typeof prisma[key as keyof typeof prisma] === 'object',
  );

  for (const tablename of tablenames) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${tablename}" CASCADE;`);
      console.log(`  ✓ Cleared ${tablename}`);
    } catch {
      // skip views etc.
    }
  }

  console.log('✅ Database cleaned');
}

clean()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
