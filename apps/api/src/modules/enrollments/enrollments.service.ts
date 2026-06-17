import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CertificateService } from '../certificate/certificate.service';

@Injectable()
export class EnrollmentsService {
  private readonly logger = new Logger(EnrollmentsService.name);
  constructor(
    private readonly db: DatabaseService,
    private readonly cert: CertificateService,
  ) {}

  async enroll(userId: string, courseId: string) {
    const course = await this.db.course.findUnique({ where: { id: courseId, deletedAt: null } });
    if (!course) throw new NotFoundException('Course not found');
    if (course.hidden) {
      const hasAccess = await this.db.learningPathCourse.findFirst({
        where: {
          courseId,
          learningPath: {
            assignments: { some: { assigneeType: 'user', assigneeId: userId } },
          },
        },
      });
      if (!hasAccess) throw new NotFoundException('Course not found');
    }

    const existing = await this.db.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (existing) throw new ConflictException('Already enrolled');

    return this.db.enrollment.create({
      data: { userId, courseId },
      include: {
        course: { select: { id: true, title: true, slug: true, thumbnail: true } },
      },
    });
  }

  async getEnrollments(userId: string) {
    return this.db.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          select: { id: true, title: true, slug: true, thumbnail: true, level: true, estimatedHours: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getEnrollment(userId: string, courseId: string) {
    const enrollment = await this.db.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
      include: {
        lessonCompletions: true,
        quizAttempts: {
          include: {
            quiz: {
              select: { id: true, title: true, passingScore: true, maxAttempts: true, timeLimit: true },
            },
            answers: {
              include: {
                question: {
                  select: {
                    id: true, title: true, type: true, points: true,
                    correctAnswer: true, correctAnswers: true,
                    options: { select: { id: true, text: true, isCorrect: true }, orderBy: { sortOrder: 'asc' } },
                    matchingPairs: { select: { id: true, left: true, right: true } },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        course: {
          include: {
            modules: {
              orderBy: { sortOrder: 'asc' },
              include: {
                sections: {
                  orderBy: { sortOrder: 'asc' },
                  include: {
                    lessons: {
                      orderBy: { sortOrder: 'asc' },
                      include: { completions: { where: { userId } }, resources: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!enrollment) throw new NotFoundException('Not enrolled');
    return enrollment;
  }

  async completeLesson(userId: string, lessonId: string, enrollmentId: string, data?: { timeSpent?: number; watchProgress?: number; score?: number }) {
    const lesson = await this.db.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Lesson not found');

    const completion = await this.db.lessonCompletion.upsert({
      where: { userId_lessonId_enrollmentId: { userId, lessonId, enrollmentId } },
      update: {
        completed: true,
        completedAt: new Date(),
        timeSpent: data?.timeSpent,
        watchProgress: data?.watchProgress,
        score: data?.score,
      },
      create: {
        userId,
        lessonId,
        enrollmentId,
        completed: true,
        completedAt: new Date(),
        timeSpent: data?.timeSpent,
        watchProgress: data?.watchProgress,
        score: data?.score,
      },
    });

    await this.recalculateProgress(enrollmentId);
    return completion;
  }

  async updateProgress(userId: string, lessonId: string, enrollmentId: string, watchProgress: number, timeSpent?: number) {
    return this.db.lessonCompletion.upsert({
      where: { userId_lessonId_enrollmentId: { userId, lessonId, enrollmentId } },
      update: { watchProgress, timeSpent, completed: watchProgress >= 90 },
      create: { userId, lessonId, enrollmentId, watchProgress, timeSpent, completed: watchProgress >= 90 },
    });
  }

  private async recalculateProgress(enrollmentId: string) {
    const enrollment = await this.db.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        course: {
          include: {
            modules: {
              include: {
                sections: { include: { lessons: { select: { id: true } } } },
              },
            },
          },
        },
        lessonCompletions: { where: { completed: true } },
      },
    });

    if (!enrollment) return;

    const totalLessons = enrollment.course.modules.reduce(
      (sum, m) => sum + m.sections.reduce((s, sec) => s + sec.lessons.length, 0), 0,
    );

    const completedCount = enrollment.lessonCompletions.length;
    const progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
    const wasCompleted = enrollment.status === 'completed';
    const isNowCompleted = progress >= 100;

    await this.db.enrollment.update({
      where: { id: enrollmentId },
      data: {
        progress,
        status: isNowCompleted ? 'completed' : 'active',
        completedAt: isNowCompleted ? new Date() : undefined,
      },
    });

    if (isNowCompleted && !wasCompleted && enrollment.course.hasCertificate) {
      try {
        await this.cert.issue({
          userId: enrollment.userId,
          courseId: enrollment.courseId,
          templateId: enrollment.course.certificateTemplateId || undefined,
        });
        this.logger.log(`Certificate auto-issued for user ${enrollment.userId} in course ${enrollment.courseId}`);
      } catch (e: any) {
        if (!e.message?.includes('Already') && !e.message?.includes('Unique')) {
          this.logger.error(`Failed to auto-issue certificate: ${e.message}`);
        }
      }
    }
  }

  async dropEnrollment(userId: string, courseId: string) {
    const enrollment = await this.db.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    return this.db.enrollment.update({
      where: { id: enrollment.id },
      data: { status: 'dropped' },
    });
  }

  // ─── Bookmarks ───

  async getBookmarks(userId: string, lessonId?: string) {
    const where: any = { userId };
    if (lessonId) where.lessonId = lessonId;
    return this.db.bookmark.findMany({
      where,
      include: { lesson: { select: { id: true, title: true, type: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createBookmark(userId: string, data: { lessonId: string; timestamp?: number; note?: string }) {
    return this.db.bookmark.create({
      data: { userId, lessonId: data.lessonId, timestamp: data.timestamp, note: data.note },
      include: { lesson: { select: { id: true, title: true } } },
    });
  }

  async deleteBookmark(id: string, userId: string) {
    const bookmark = await this.db.bookmark.findFirst({ where: { id, userId } });
    if (!bookmark) throw new NotFoundException('Bookmark not found');
    await this.db.bookmark.delete({ where: { id } });
    return { message: 'Bookmark deleted' };
  }

  // ─── Notes ───

  async getNotes(userId: string, lessonId?: string) {
    const where: any = { userId };
    if (lessonId) where.lessonId = lessonId;
    return this.db.note.findMany({
      where,
      include: { lesson: { select: { id: true, title: true } } },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createNote(userId: string, data: { lessonId: string; content: string; timestamp?: number }) {
    return this.db.note.create({
      data: { userId, lessonId: data.lessonId, content: data.content, timestamp: data.timestamp },
      include: { lesson: { select: { id: true, title: true } } },
    });
  }

  async updateNote(id: string, userId: string, data: { content?: string }) {
    const note = await this.db.note.findFirst({ where: { id, userId } });
    if (!note) throw new NotFoundException('Note not found');
    return this.db.note.update({ where: { id }, data });
  }

  async deleteNote(id: string, userId: string) {
    const note = await this.db.note.findFirst({ where: { id, userId } });
    if (!note) throw new NotFoundException('Note not found');
    await this.db.note.delete({ where: { id } });
    return { message: 'Note deleted' };
  }
}
