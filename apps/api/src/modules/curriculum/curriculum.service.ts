import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class CurriculumService {
  constructor(private readonly db: DatabaseService) {}

  // ─── Modules ───

  async createModule(courseId: string, data: { title: string; description?: string }) {
    const course = await this.db.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');

    const maxSort = await this.db.courseModule.aggregate({
      where: { courseId },
      _max: { sortOrder: true },
    });

    return this.db.courseModule.create({
      data: {
        courseId,
        title: data.title,
        description: data.description,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
      include: { sections: { include: { lessons: true }, orderBy: { sortOrder: 'asc' } } },
    });
  }

  async updateModule(moduleId: string, data: { title?: string; description?: string }) {
    const mod = await this.db.courseModule.findUnique({ where: { id: moduleId } });
    if (!mod) throw new NotFoundException('Module not found');
    return this.db.courseModule.update({ where: { id: moduleId }, data });
  }

  async deleteModule(moduleId: string) {
    const mod = await this.db.courseModule.findUnique({ where: { id: moduleId } });
    if (!mod) throw new NotFoundException('Module not found');
    await this.db.courseModule.delete({ where: { id: moduleId } });
    return { message: 'Module deleted' };
  }

  async reorderModules(courseId: string, moduleIds: string[]) {
    const course = await this.db.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');

    await this.db.$transaction(
      moduleIds.map((id, index) =>
        this.db.courseModule.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );

    return this.db.courseModule.findMany({
      where: { courseId },
      orderBy: { sortOrder: 'asc' },
      include: { sections: { include: { lessons: true }, orderBy: { sortOrder: 'asc' } } },
    });
  }

  // ─── Sections ───

  async createSection(moduleId: string, data: { title: string; description?: string }) {
    const mod = await this.db.courseModule.findUnique({ where: { id: moduleId } });
    if (!mod) throw new NotFoundException('Module not found');

    const maxSort = await this.db.courseSection.aggregate({
      where: { moduleId },
      _max: { sortOrder: true },
    });

    return this.db.courseSection.create({
      data: {
        moduleId,
        title: data.title,
        description: data.description,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
      include: { lessons: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async updateSection(sectionId: string, data: { title?: string; description?: string }) {
    const section = await this.db.courseSection.findUnique({ where: { id: sectionId } });
    if (!section) throw new NotFoundException('Section not found');
    return this.db.courseSection.update({ where: { id: sectionId }, data });
  }

  async deleteSection(sectionId: string) {
    const section = await this.db.courseSection.findUnique({ where: { id: sectionId } });
    if (!section) throw new NotFoundException('Section not found');
    await this.db.courseSection.delete({ where: { id: sectionId } });
    return { message: 'Section deleted' };
  }

  async reorderSections(moduleId: string, sectionIds: string[]) {
    const mod = await this.db.courseModule.findUnique({ where: { id: moduleId } });
    if (!mod) throw new NotFoundException('Module not found');

    await this.db.$transaction(
      sectionIds.map((id, index) =>
        this.db.courseSection.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );

    return this.db.courseSection.findMany({
      where: { moduleId },
      orderBy: { sortOrder: 'asc' },
      include: { lessons: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  // ─── Lessons ───

  async createLesson(sectionId: string, data: {
    title: string;
    slug: string;
    type: string;
    description?: string;
    content?: string;
    isFree?: boolean;
    isRequired?: boolean;
    videoUrl?: string;
    videoDuration?: number;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    embedUrl?: string;
    externalUrl?: string;
    scormPackageId?: string;
  }) {
    const section = await this.db.courseSection.findUnique({ where: { id: sectionId } });
    if (!section) throw new NotFoundException('Section not found');

    const maxSort = await this.db.lesson.aggregate({
      where: { sectionId },
      _max: { sortOrder: true },
    });

    return this.db.lesson.create({
      data: {
        sectionId,
        title: data.title,
        slug: data.slug,
        type: data.type,
        description: data.description,
        content: data.content,
        isFree: data.isFree ?? false,
        isRequired: data.isRequired ?? true,
        videoUrl: data.videoUrl,
        videoDuration: data.videoDuration,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.fileSize,
        embedUrl: data.embedUrl,
        externalUrl: data.externalUrl,
        scormPackageId: data.scormPackageId,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
      include: { resources: true },
    });
  }

  async updateLesson(lessonId: string, data: any) {
    const lesson = await this.db.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    return this.db.lesson.update({ where: { id: lessonId }, data, include: { resources: true } });
  }

  async deleteLesson(lessonId: string) {
    const lesson = await this.db.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Lesson not found');
    await this.db.lesson.delete({ where: { id: lessonId } });
    return { message: 'Lesson deleted' };
  }

  async reorderLessons(sectionId: string, lessonIds: string[]) {
    const section = await this.db.courseSection.findUnique({ where: { id: sectionId } });
    if (!section) throw new NotFoundException('Section not found');

    await this.db.$transaction(
      lessonIds.map((id, index) =>
        this.db.lesson.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );

    return this.db.lesson.findMany({
      where: { sectionId },
      orderBy: { sortOrder: 'asc' },
      include: { resources: true },
    });
  }

  // ─── Resources ───

  async addResource(lessonId: string, data: { title: string; type: string; url: string; fileSize?: number }) {
    const lesson = await this.db.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Lesson not found');

    const maxSort = await this.db.lessonResource.aggregate({
      where: { lessonId },
      _max: { sortOrder: true },
    });

    return this.db.lessonResource.create({
      data: {
        lessonId,
        title: data.title,
        type: data.type,
        url: data.url,
        fileSize: data.fileSize,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
      },
    });
  }

  async deleteResource(resourceId: string) {
    await this.db.lessonResource.delete({ where: { id: resourceId } });
    return { message: 'Resource deleted' };
  }

  // ─── Bulk curriculum save (autosave) ───

  async saveCurriculum(courseId: string, curriculum: {
    modules: Array<{
      id?: string;
      title: string;
      description?: string;
      sections: Array<{
        id?: string;
        title: string;
        description?: string;
          lessons: Array<{
            id?: string;
            title: string;
            slug: string;
            type: string;
            description?: string;
            content?: string;
            isFree?: boolean;
            isRequired?: boolean;
            videoUrl?: string;
            videoDuration?: number;
            scormPackageId?: string;
            sortOrder: number;
          }>;
        sortOrder: number;
      }>;
      sortOrder: number;
    }>;
  }) {
    const course = await this.db.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');

    await this.db.$transaction(async (tx) => {
      const existingModuleIds = (await tx.courseModule.findMany({ where: { courseId }, select: { id: true } })).map(m => m.id);
      const incomingModuleIds = curriculum.modules.filter(m => m.id).map(m => m.id!);
      const modulesToDelete = existingModuleIds.filter(id => !incomingModuleIds.includes(id));

      for (const moduleId of modulesToDelete) {
        await tx.courseModule.delete({ where: { id: moduleId } });
      }

      for (let mi = 0; mi < curriculum.modules.length; mi++) {
        const mod = curriculum.modules[mi]!;
        let moduleRecord;

        if (mod.id && existingModuleIds.includes(mod.id)) {
          moduleRecord = await tx.courseModule.update({
            where: { id: mod.id },
            data: { title: mod.title, description: mod.description, sortOrder: mod.sortOrder },
          });
        } else {
          moduleRecord = await tx.courseModule.create({
            data: { courseId, title: mod.title, description: mod.description, sortOrder: mod.sortOrder },
          });
        }

        const existingSectionIds = (await tx.courseSection.findMany({ where: { moduleId: moduleRecord.id }, select: { id: true } })).map(s => s.id);
        const incomingSectionIds = mod.sections.filter(s => s.id).map(s => s.id!);
        const sectionsToDelete = existingSectionIds.filter(id => !incomingSectionIds.includes(id));

        for (const sectionId of sectionsToDelete) {
          await tx.courseSection.delete({ where: { id: sectionId } });
        }

        for (let si = 0; si < mod.sections.length; si++) {
          const sec = mod.sections[si]!;
          let sectionRecord;

          if (sec.id && existingSectionIds.includes(sec.id)) {
            sectionRecord = await tx.courseSection.update({
              where: { id: sec.id },
              data: { title: sec.title, description: sec.description, sortOrder: sec.sortOrder },
            });
          } else {
            sectionRecord = await tx.courseSection.create({
              data: { moduleId: moduleRecord.id, title: sec.title, description: sec.description, sortOrder: sec.sortOrder },
            });
          }

          const existingLessonIds = (await tx.lesson.findMany({ where: { sectionId: sectionRecord.id }, select: { id: true } })).map(l => l.id);
          const incomingLessonIds = sec.lessons.filter(l => l.id).map(l => l.id!);
          const lessonsToDelete = existingLessonIds.filter(id => !incomingLessonIds.includes(id));

          for (const lessonId of lessonsToDelete) {
            await tx.lesson.delete({ where: { id: lessonId } });
          }

          for (let li = 0; li < sec.lessons.length; li++) {
            const les = sec.lessons[li]!;
            if (les.id && existingLessonIds.includes(les.id)) {
              await tx.lesson.update({
                where: { id: les.id },
                data: {
                  title: les.title,
                  slug: les.slug,
                  type: les.type,
                  description: les.description,
                  content: les.content,
                  isFree: les.isFree ?? false,
                  isRequired: les.isRequired ?? true,
                  videoUrl: les.videoUrl,
                  videoDuration: les.videoDuration,
                  scormPackageId: les.scormPackageId,
                  sortOrder: les.sortOrder,
                },
              });
            } else {
              await tx.lesson.create({
                data: {
                  sectionId: sectionRecord.id,
                  title: les.title,
                  slug: les.slug,
                  type: les.type,
                  description: les.description,
                  content: les.content,
                  isFree: les.isFree ?? false,
                  isRequired: les.isRequired ?? true,
                  videoUrl: les.videoUrl,
                  videoDuration: les.videoDuration,
                  scormPackageId: les.scormPackageId,
                  sortOrder: les.sortOrder,
                },
              });
            }
          }
        }
      }
    });

    return this.db.course.findUnique({
      where: { id: courseId },
      include: {
        modules: {
          orderBy: { sortOrder: 'asc' },
          include: {
            sections: {
              orderBy: { sortOrder: 'asc' },
              include: { lessons: { orderBy: { sortOrder: 'asc' }, include: { resources: true, scormPackage: true } } },
            },
          },
        },
      },
    });
  }
}
