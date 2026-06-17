import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class CoursesService {
  constructor(private readonly db: DatabaseService) {}

  private slugify(text: string): string {
    return text
      .toString()
      .normalize('NFKD')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    search?: string;
    organizationId?: string;
    categoryId?: string;
    status?: string;
    level?: string;
    includeHidden?: boolean;
  }) {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null, hidden: params.includeHidden ? undefined : false };

    if (params.search) {
      where.OR = [
        { title: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    if (params.organizationId) where.organizationId = params.organizationId;
    if (params.categoryId) where.categoryId = params.categoryId;
    if (params.status) where.status = params.status;
    if (params.level) where.level = params.level;

    const [data, total] = await Promise.all([
      this.db.course.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: { select: { id: true, name: true, slug: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true, avatar: true } },
          _count: { select: { modules: true, enrollments: true } },
        },
      }),
      this.db.course.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit), hasNextPage: page * limit < total, hasPreviousPage: page > 1 },
    };
  }

  async findById(id: string) {
    const course = await this.db.course.findUnique({
      where: { id, deletedAt: null },
      include: {
        category: true,
        createdBy: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        modules: {
          orderBy: { sortOrder: 'asc' },
          include: {
            sections: {
              orderBy: { sortOrder: 'asc' },
              include: {
                lessons: {
                  orderBy: { sortOrder: 'asc' },
                  include: { resources: true, scormPackage: true },
                },
              },
            },
          },
        },
        _count: { select: { enrollments: true } },
      },
    });

    if (!course) throw new NotFoundException('Course not found');
    return course;
  }

  async create(data: {
    organizationId: string;
    title: string;
    slug?: string;
    subtitle?: string;
    description?: string;
    categoryId?: string;
    level?: string;
    language?: string;
    createdById: string;
    status?: string;
    hidden?: boolean;
  }) {
    return this.db.course.create({
      data: {
        organizationId: data.organizationId,
        title: data.title,
        slug: data.slug || this.slugify(data.title),
        subtitle: data.subtitle,
        description: data.description,
        categoryId: data.categoryId,
        level: data.level || 'all',
        language: data.language || 'en',
        createdById: data.createdById,
        status: data.status || 'draft',
        hidden: data.hidden ?? false,
      },
    });
  }

  async update(id: string, data: any) {
    const course = await this.db.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');
    return this.db.course.update({ where: { id }, data });
  }

  async delete(id: string) {
    const course = await this.db.course.findUnique({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');
    await this.db.course.update({ where: { id }, data: { deletedAt: new Date(), status: 'archived' } });
    return { message: 'Course deleted successfully' };
  }

  async publish(id: string) {
    const course = await this.db.course.findUnique({
      where: { id },
      include: {
        modules: {
          include: {
            sections: {
              include: { lessons: { select: { id: true } } },
            },
          },
        },
      },
    });
    if (!course) throw new NotFoundException('Course not found');

    const lessonIds = course.modules.flatMap((m) =>
      m.sections.flatMap((s) => s.lessons.map((l) => l.id)),
    );

    await this.db.$transaction([
      this.db.course.update({
        where: { id },
        data: { status: 'published', publishedAt: new Date() },
      }),
      this.db.courseModule.updateMany({
        where: { courseId: id },
        data: { status: 'published' },
      }),
      this.db.courseSection.updateMany({
        where: { module: { courseId: id } },
        data: { status: 'published' },
      }),
      ...(lessonIds.length > 0
        ? [
            this.db.lesson.updateMany({
              where: { id: { in: lessonIds } },
              data: { status: 'published' },
            }),
          ]
        : []),
    ]);

    return course;
  }

  async archive(id: string) {
    return this.db.course.update({
      where: { id },
      data: { status: 'archived' },
    });
  }

  async duplicate(id: string) {
    const original = await this.db.course.findUnique({
      where: { id },
      include: {
        modules: {
          include: {
            sections: {
              include: { lessons: { include: { resources: true } } },
            },
          },
        },
      },
    });

    if (!original) throw new NotFoundException('Course not found');

    const newCourse = await this.db.course.create({
      data: {
        organizationId: original.organizationId,
        title: `${original.title} (Copy)`,
        slug: `${original.slug}-copy-${Date.now()}`,
        subtitle: original.subtitle,
        description: original.description,
        categoryId: original.categoryId,
        level: original.level,
        language: original.language,
        createdById: original.createdById,
        tags: original.tags,
        status: 'draft',
      },
    });

    for (const module of original.modules) {
      const newModule = await this.db.courseModule.create({
        data: {
          courseId: newCourse.id,
          title: module.title,
          description: module.description,
          sortOrder: module.sortOrder,
          status: 'draft',
        },
      });

      for (const section of module.sections) {
        const newSection = await this.db.courseSection.create({
          data: {
            moduleId: newModule.id,
            title: section.title,
            description: section.description,
            sortOrder: section.sortOrder,
            status: 'draft',
          },
        });

        for (const lesson of section.lessons) {
          await this.db.lesson.create({
            data: {
              sectionId: newSection.id,
              title: lesson.title,
              slug: `${lesson.slug}-copy`,
              description: lesson.description,
              type: lesson.type,
              content: lesson.content,
              duration: lesson.duration,
              sortOrder: lesson.sortOrder,
              status: 'draft',
              isFree: lesson.isFree,
              isRequired: lesson.isRequired,
            },
          });
        }
      }
    }

    return newCourse;
  }

  async getFirstOrganizationId(): Promise<string> {
    const org = await this.db.organization.findFirst({ select: { id: true } });
    if (!org) throw new NotFoundException('No organization exists. Create one first.');
    return org.id;
  }

  async getCategories(organizationId?: string) {
    const where: any = {};
    if (organizationId) where.organizationId = organizationId;
    return this.db.courseCategory.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { courses: true } } },
    });
  }

  async createCategory(data: { organizationId?: string; name: string; slug: string; description?: string }) {
    return this.db.courseCategory.create({ data });
  }

  async updateCategory(id: string, data: any) {
    return this.db.courseCategory.update({ where: { id }, data });
  }

  async deleteCategory(id: string) {
    await this.db.courseCategory.delete({ where: { id } });
    return { message: 'Category deleted' };
  }
}
