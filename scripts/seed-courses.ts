import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding courses...');

  // Get or create default organization
  let org = await prisma.organization.findFirst({ where: { slug: 'sohaara-academy' } });
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: 'Sohaara Academy',
        slug: 'sohaara-academy',
        description: 'Default training organization',
      },
    });
    console.log('  ✓ Organization created: Sohaara Academy');
  }

  // Get admin user
  const admin = await prisma.user.findUnique({ where: { email: 'admin@sohaara.com' } });
  if (!admin) throw new Error('Admin user not found. Run seed first.');

  // Get categories
  const webDevCat = await prisma.courseCategory.findFirst({ where: { slug: 'web-development' } });
  const dataSciCat = await prisma.courseCategory.findFirst({ where: { slug: 'data-science' } });
  const devopsCat = await prisma.courseCategory.findFirst({ where: { slug: 'devops' } });

  const courses = [
    {
      title: 'JavaScript Fundamentals',
      slug: 'javascript-fundamentals',
      subtitle: 'Master the basics of JavaScript programming',
      description: 'A comprehensive introduction to JavaScript covering variables, functions, objects, arrays, closures, promises, and modern ES6+ features. Perfect for beginners and those looking to solidify their foundation.',
      excerpt: 'Learn JavaScript from scratch with hands-on exercises and real-world projects.',
      organizationId: org.id,
      categoryId: webDevCat?.id,
      level: 'beginner',
      language: 'en',
      status: 'published',
      estimatedHours: 25,
      featured: true,
      tags: ['javascript', 'web', 'frontend', 'programming'],
      createdById: admin.id,
      publishedAt: new Date(),
    },
    {
      title: 'React & Next.js Mastery',
      slug: 'react-nextjs-mastery',
      subtitle: 'Build modern web apps with React 19 and Next.js 16',
      description: 'Dive deep into React 19 including Server Components, Server Actions, and the new hook APIs. Build full-stack applications with Next.js 16 App Router, authentication, and database integration.',
      excerpt: 'Go from React beginner to production-ready Next.js developer.',
      organizationId: org.id,
      categoryId: webDevCat?.id,
      level: 'intermediate',
      language: 'en',
      status: 'published',
      estimatedHours: 40,
      featured: true,
      tags: ['react', 'nextjs', 'fullstack', 'typescript'],
      createdById: admin.id,
      publishedAt: new Date(),
    },
    {
      title: 'Python for Data Science',
      slug: 'python-for-data-science',
      subtitle: 'Learn Python with NumPy, Pandas, and Jupyter',
      description: 'A practical course covering Python programming for data analysis and visualization. Work with real datasets, learn data cleaning, exploration, and create compelling visualizations.',
      excerpt: 'Transform raw data into actionable insights with Python.',
      organizationId: org.id,
      categoryId: dataSciCat?.id,
      level: 'beginner',
      language: 'en',
      status: 'published',
      estimatedHours: 30,
      featured: false,
      tags: ['python', 'data-science', 'pandas', 'numpy'],
      createdById: admin.id,
      publishedAt: new Date(),
    },
    {
      title: 'Machine Learning A-Z',
      slug: 'machine-learning-a-z',
      subtitle: 'From linear regression to deep learning',
      description: 'Covering supervised and unsupervised learning, neural networks, NLP, and computer vision. Includes scikit-learn, TensorFlow, and PyTorch implementations with real-world case studies.',
      excerpt: 'Build and deploy machine learning models for real applications.',
      organizationId: org.id,
      categoryId: dataSciCat?.id,
      level: 'advanced',
      language: 'en',
      status: 'draft',
      estimatedHours: 60,
      featured: false,
      tags: ['machine-learning', 'deep-learning', 'tensorflow', 'pytorch'],
      createdById: admin.id,
    },
    {
      title: 'Docker & Kubernetes Bootcamp',
      slug: 'docker-kubernetes-bootcamp',
      subtitle: 'Containerization and orchestration from zero to hero',
      description: 'Learn Docker from the ground up including container images, volumes, networks, docker-compose, and Kubernetes orchestration. Deploy microservices with CI/CD pipelines.',
      excerpt: 'Containerize and orchestrate your applications like a pro.',
      organizationId: org.id,
      categoryId: devopsCat?.id,
      level: 'intermediate',
      language: 'en',
      status: 'published',
      estimatedHours: 35,
      featured: true,
      tags: ['docker', 'kubernetes', 'devops', 'containers'],
      createdById: admin.id,
      publishedAt: new Date(),
    },
    {
      title: 'REST API Design & Development',
      slug: 'rest-api-design',
      subtitle: 'Build scalable APIs with NestJS and PostgreSQL',
      description: 'Best practices for designing, building, and documenting REST APIs using NestJS, Prisma, and PostgreSQL. Covers authentication, authorization, validation, testing, and deployment.',
      excerpt: 'Design production-grade REST APIs that scale.',
      organizationId: org.id,
      categoryId: webDevCat?.id,
      level: 'intermediate',
      language: 'en',
      status: 'published',
      estimatedHours: 20,
      featured: false,
      tags: ['nestjs', 'api', 'rest', 'prisma', 'postgresql'],
      createdById: admin.id,
      publishedAt: new Date(),
    },
    {
      title: 'Cybersecurity Essentials',
      slug: 'cybersecurity-essentials',
      subtitle: 'Protect systems and data from cyber threats',
      description: 'Learn fundamental cybersecurity concepts including network security, encryption, identity management, threat detection, and incident response. Prepares for CompTIA Security+ certification.',
      excerpt: 'Essential cybersecurity skills for every IT professional.',
      organizationId: org.id,
      level: 'beginner',
      language: 'en',
      status: 'draft',
      estimatedHours: 45,
      featured: false,
      tags: ['cybersecurity', 'security', 'network', 'encryption'],
      createdById: admin.id,
    },
    {
      title: 'UI/UX Design Fundamentals',
      slug: 'ui-ux-design-fundamentals',
      subtitle: 'Design beautiful and usable interfaces',
      description: 'Learn the design thinking process, user research, wireframing, prototyping, visual design principles, and usability testing. Tools include Figma and Adobe XD.',
      excerpt: 'Create user-centered designs that delight and convert.',
      organizationId: org.id,
      level: 'beginner',
      language: 'en',
      status: 'published',
      estimatedHours: 22,
      featured: false,
      tags: ['design', 'ui', 'ux', 'figma', 'prototyping'],
      createdById: admin.id,
      publishedAt: new Date(),
    },
    {
      title: 'AWS Cloud Practitioner',
      slug: 'aws-cloud-practitioner',
      subtitle: 'Prepare for the AWS Certified Cloud Practitioner exam',
      description: 'Comprehensive coverage of AWS cloud concepts, core services, security, architecture best practices, pricing, and support. Includes practice exams and hands-on labs.',
      excerpt: 'Get AWS certified and master cloud computing fundamentals.',
      organizationId: org.id,
      categoryId: devopsCat?.id,
      level: 'beginner',
      language: 'en',
      status: 'published',
      estimatedHours: 30,
      featured: false,
      tags: ['aws', 'cloud', 'certification', 'devops'],
      createdById: admin.id,
      publishedAt: new Date(),
    },
    {
      title: 'TypeScript Deep Dive',
      slug: 'typescript-deep-dive',
      subtitle: 'Advanced TypeScript patterns and best practices',
      description: 'Master TypeScript generics, conditional types, mapped types, template literal types, decorators, and advanced patterns. Build type-safe libraries and applications.',
      excerpt: 'Write safer, more maintainable code with advanced TypeScript.',
      organizationId: org.id,
      categoryId: webDevCat?.id,
      level: 'advanced',
      language: 'en',
      status: 'draft',
      estimatedHours: 25,
      featured: false,
      tags: ['typescript', 'javascript', 'type-safety', 'patterns'],
      createdById: admin.id,
    },
  ];

  for (const courseData of courses) {
    const existing = await prisma.course.findFirst({
      where: { slug: courseData.slug, deletedAt: null },
    });
    if (existing) {
      console.log(`  - Skipping (exists): ${courseData.title}`);
      continue;
    }

    const course = await prisma.course.create({ data: courseData });
    console.log(`  ✓ Created: ${course.title}`);

    // Create modules with sections and lessons for published courses
    if (courseData.status === 'published') {
      const module1 = await prisma.courseModule.create({
        data: { courseId: course.id, title: 'Getting Started', sortOrder: 0, status: 'published' },
      });

      await prisma.courseSection.create({
        data: {
          moduleId: module1.id,
          title: 'Introduction',
          sortOrder: 0,
          status: 'published',
          lessons: {
            create: [
              {
                title: 'Welcome and Overview',
                slug: `${courseData.slug}-welcome`,
                type: 'text',
                content: `Welcome to **${courseData.title}**! This course covers ${courseData.description.substring(0, 100)}...`,
                sortOrder: 0,
                status: 'published',
                duration: 600,
              },
              {
                title: 'Setting Up Your Environment',
                slug: `${courseData.slug}-setup`,
                type: 'text',
                content: 'Follow these steps to set up your development environment for this course.',
                sortOrder: 1,
                status: 'published',
                duration: 900,
              },
            ],
          },
        },
      });

      const module2 = await prisma.courseModule.create({
        data: { courseId: course.id, title: 'Core Concepts', sortOrder: 1, status: 'published' },
      });

      await prisma.courseSection.create({
        data: {
          moduleId: module2.id,
          title: 'Main Topics',
          sortOrder: 0,
          status: 'published',
          lessons: {
            create: [
              {
                title: 'Core Principles',
                slug: `${courseData.slug}-core-principles`,
                type: 'text',
                content: 'This lesson covers the core principles and fundamental concepts.',
                sortOrder: 0,
                status: 'published',
                duration: 1200,
              },
              {
                title: 'Hands-On Practice',
                slug: `${courseData.slug}-practice`,
                type: 'text',
                content: 'Apply what you have learned in this practical exercise.',
                sortOrder: 1,
                status: 'published',
                duration: 1800,
              },
            ],
          },
        },
      });

      const module3 = await prisma.courseModule.create({
        data: { courseId: course.id, title: 'Advanced Topics', sortOrder: 2, status: 'published' },
      });

      await prisma.courseSection.create({
        data: {
          moduleId: module3.id,
          title: 'Going Further',
          sortOrder: 0,
          status: 'published',
          lessons: {
            create: [
              {
                title: 'Advanced Techniques',
                slug: `${courseData.slug}-advanced`,
                type: 'text',
                content: 'Explore advanced techniques and best practices.',
                sortOrder: 0,
                status: 'published',
                duration: 1500,
              },
              {
                title: 'Final Project',
                slug: `${courseData.slug}-final-project`,
                type: 'text',
                content: 'Complete the final project to demonstrate your skills.',
                sortOrder: 1,
                status: 'published',
                duration: 3600,
              },
            ],
          },
        },
      });
    }
  }

  console.log('✅ Course seeding complete');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
