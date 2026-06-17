import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class LearningPathService {
  constructor(private readonly db: DatabaseService) {}

  async findAll(organizationId?: string) {
    const where: any = { status: { not: 'archived' } };
    if (organizationId) where.organizationId = organizationId;
    return this.db.learningPath.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        coursesRelation: { include: { course: { select: { id: true, title: true, thumbnail: true, estimatedHours: true, level: true } } } },
        assignments: true,
      },
    });
  }

  async findById(id: string) {
    const path = await this.db.learningPath.findUnique({
      where: { id },
      include: {
        coursesRelation: {
          orderBy: { sortOrder: 'asc' },
          include: { course: { select: { id: true, title: true, thumbnail: true, estimatedHours: true, level: true, description: true } } },
        },
        assignments: true,
      },
    });
    if (!path) throw new NotFoundException('Learning path not found');
    return path;
  }

  async create(data: {
    organizationId: string;
    title: string;
    description?: string;
    thumbnail?: string;
    targetAudience?: string;
    isMandatory?: boolean;
    deadline?: string;
    estimatedHours?: number;
    courses?: { courseId: string; sortOrder: number; isMandatory?: boolean; prerequisites?: string[] }[];
  }) {
    const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const { courses, ...rest } = data;
    return this.db.learningPath.create({
      data: {
        organization: { connect: { id: rest.organizationId } },
        title: rest.title,
        slug: `${slug}-${Date.now().toString(36)}`,
        description: rest.description,
        thumbnail: rest.thumbnail,
        targetAudience: rest.targetAudience,
        isMandatory: rest.isMandatory ?? false,
        deadline: rest.deadline ? new Date(rest.deadline) : undefined,
        estimatedHours: rest.estimatedHours,
        courses: courses?.map((c) => c.courseId) || [],
        coursesRelation: courses
          ? {
              create: courses.map((c, i) => ({
                courseId: c.courseId,
                sortOrder: c.sortOrder ?? i,
                isMandatory: c.isMandatory ?? true,
                prerequisites: c.prerequisites || [],
              })),
            }
          : undefined,
      },
      include: {
        coursesRelation: {
          orderBy: { sortOrder: 'asc' },
          include: { course: { select: { id: true, title: true, thumbnail: true, estimatedHours: true, level: true } } },
        },
      },
    });
  }

  async update(id: string, data: any) {
    const path = await this.db.learningPath.findUnique({ where: { id } });
    if (!path) throw new NotFoundException('Learning path not found');

    const { courses, ...rest } = data;

    if (courses) {
      await this.db.learningPathCourse.deleteMany({ where: { learningPathId: id } });
      await this.db.learningPathCourse.createMany({
        data: courses.map((c: any, i: number) => ({
          learningPathId: id,
          courseId: c.courseId || c,
          sortOrder: c.sortOrder ?? i,
          isMandatory: c.isMandatory ?? true,
          prerequisites: c.prerequisites || [],
        })),
      });
    }

    return this.db.learningPath.update({
      where: { id },
      data: {
        ...rest,
        courses: courses ? courses.map((c: any) => c.courseId || c) : undefined,
        deadline: rest.deadline ? new Date(rest.deadline) : rest.deadline === null ? null : undefined,
      },
      include: {
        coursesRelation: {
          orderBy: { sortOrder: 'asc' },
          include: { course: { select: { id: true, title: true, thumbnail: true, estimatedHours: true, level: true } } },
        },
      },
    });
  }

  async delete(id: string) {
    await this.db.learningPath.update({ where: { id }, data: { status: 'archived' } });
    return { message: 'Learning path archived' };
  }

  async publish(id: string) {
    return this.db.learningPath.update({ where: { id }, data: { status: 'published' } });
  }

  async addCourse(id: string, courseData: { courseId: string; sortOrder?: number; isMandatory?: boolean; prerequisites?: string[] }) {
    const path = await this.db.learningPath.findUnique({ where: { id } });
    if (!path) throw new NotFoundException('Learning path not found');

    const existing = await this.db.learningPathCourse.findUnique({
      where: { learningPathId_courseId: { learningPathId: id, courseId: courseData.courseId } },
    });
    if (existing) throw new BadRequestException('Course already in learning path');

    const maxOrder = await this.db.learningPathCourse.findFirst({
      where: { learningPathId: id },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });

    const lpc = await this.db.learningPathCourse.create({
      data: {
        learningPathId: id,
        courseId: courseData.courseId,
        sortOrder: courseData.sortOrder ?? (maxOrder?.sortOrder ?? -1) + 1,
        isMandatory: courseData.isMandatory ?? true,
        prerequisites: courseData.prerequisites || [],
      },
      include: { course: { select: { id: true, title: true, thumbnail: true, estimatedHours: true, level: true } } },
    });

    await this.db.learningPath.update({
      where: { id },
      data: { courses: { push: courseData.courseId } },
    });

    return lpc;
  }

  async reorderCourses(id: string, courseIds: string[]) {
    const path = await this.db.learningPath.findUnique({ where: { id } });
    if (!path) throw new NotFoundException('Learning path not found');

    for (let i = 0; i < courseIds.length; i++) {
      await this.db.learningPathCourse.updateMany({
        where: { learningPathId: id, courseId: courseIds[i] },
        data: { sortOrder: i },
      });
    }

    await this.db.learningPath.update({ where: { id }, data: { courses: courseIds } });

    return this.db.learningPathCourse.findMany({
      where: { learningPathId: id },
      orderBy: { sortOrder: 'asc' },
      include: { course: { select: { id: true, title: true, thumbnail: true, estimatedHours: true, level: true } } },
    });
  }

  async removeCourse(id: string, courseId: string) {
    await this.db.learningPathCourse.delete({
      where: { learningPathId_courseId: { learningPathId: id, courseId } },
    });

    const path = await this.db.learningPath.findUnique({ where: { id } });
    if (path) {
      await this.db.learningPath.update({
        where: { id },
        data: { courses: path.courses.filter((c) => c !== courseId) },
      });
    }

    return { message: 'Course removed from learning path' };
  }

  async getAssignments(id: string) {
    return this.db.learningPathAssignment.findMany({ where: { learningPathId: id } });
  }

  async createAssignment(id: string, data: { assigneeType: string; assigneeId: string }) {
    return this.db.learningPathAssignment.create({
      data: { learningPathId: id, assigneeType: data.assigneeType, assigneeId: data.assigneeId },
    });
  }

  async deleteAssignment(id: string, assignmentId: string) {
    await this.db.learningPathAssignment.delete({ where: { id: assignmentId, learningPathId: id } });
    return { message: 'Assignment removed' };
  }

  async getMyPaths(userId: string, organizationId?: string) {
    const userAssignments = await this.db.learningPathAssignment.findMany({
      where: { assigneeId: userId, assigneeType: 'user' },
      select: { learningPathId: true },
    });

    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { roleAssignments: { select: { roleId: true } } },
    });

    const roleAssignments = await this.db.learningPathAssignment.findMany({
      where: {
        assigneeType: 'role',
        assigneeId: { in: user?.roleAssignments.map((r) => r.roleId) || [] },
      },
      select: { learningPathId: true },
    });

    const allIds = new Set([
      ...userAssignments.map((a) => a.learningPathId),
      ...roleAssignments.map((a) => a.learningPathId),
    ]);

    if (allIds.size === 0) return [];

    return this.db.learningPath.findMany({
      where: {
        id: { in: Array.from(allIds) },
        status: 'published',
        ...(organizationId ? { organizationId } : {}),
      },
      include: {
        coursesRelation: {
          orderBy: { sortOrder: 'asc' },
          include: { course: { select: { id: true, title: true, thumbnail: true, estimatedHours: true, level: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProgress(userId: string, pathId: string) {
    const progress = await this.db.learningPathProgress.findUnique({
      where: { userId_learningPathId: { userId, learningPathId: pathId } },
    });
    return progress || { progress: 0, completedCourses: [], startedAt: null, completedAt: null };
  }

  async updateProgress(userId: string, pathId: string, courseId: string) {
    const path = await this.db.learningPath.findUnique({ where: { id: pathId } });
    if (!path) throw new NotFoundException('Learning path not found');

    const totalCourses = path.courses.length;
    if (totalCourses === 0) throw new BadRequestException('Learning path has no courses');

    const existing = await this.db.learningPathProgress.findUnique({
      where: { userId_learningPathId: { userId, learningPathId: pathId } },
    });

    const completedCourses = new Set(existing?.completedCourses || []);
    completedCourses.add(courseId);
    const completedArr = Array.from(completedCourses);
    const progress = Math.round((completedArr.length / totalCourses) * 100);
    const isComplete = progress >= 100;

    return this.db.learningPathProgress.upsert({
      where: { userId_learningPathId: { userId, learningPathId: pathId } },
      create: {
        userId,
        learningPathId: pathId,
        progress,
        completedCourses: completedArr,
        completedAt: isComplete ? new Date() : undefined,
      },
      update: {
        progress,
        completedCourses: completedArr,
        completedAt: isComplete ? new Date() : existing?.completedAt,
      },
    });
  }

  async enrollByPath(userId: string, pathId: string) {
    const path = await this.db.learningPath.findUnique({ where: { id: pathId } });
    if (!path) throw new NotFoundException('Learning path not found');

    const results: any[] = [];
    for (const courseId of path.courses) {
      const exists = await this.db.enrollment.findFirst({
        where: { userId, courseId, status: { not: 'dropped' } },
      });
      if (!exists) {
        const enrollment = await this.db.enrollment.create({
          data: { userId, courseId, status: 'active' },
        });
        results.push(enrollment);
      }
    }

    await this.db.learningPathProgress.upsert({
      where: { userId_learningPathId: { userId, learningPathId: pathId } },
      create: { userId, learningPathId: pathId, progress: 0, completedCourses: [] },
      update: {},
    });

    return results;
  }

  async getFirstOrganizationId(): Promise<string> {
    const org = await this.db.organization.findFirst({ where: { status: 'active' } });
    if (!org) throw new BadRequestException('No active organization found');
    return org.id;
  }

  async searchPublished(query: string) {
    return this.db.learningPath.findMany({
      where: {
        status: 'published',
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { targetAudience: { contains: query, mode: 'insensitive' } },
        ],
      },
      include: {
        coursesRelation: {
          orderBy: { sortOrder: 'asc' },
          include: { course: { select: { id: true, title: true, thumbnail: true, estimatedHours: true, level: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async requestJoin(learningPathId: string, userId: string, message?: string) {
    const path = await this.db.learningPath.findUnique({ where: { id: learningPathId } });
    if (!path) throw new NotFoundException('Learning path not found');
    if (path.status !== 'published') throw new BadRequestException('Learning path is not published');

    const existing = await this.db.learningPathAssignment.findFirst({
      where: { learningPathId, assigneeId: userId, assigneeType: 'user' },
    });
    if (existing) throw new BadRequestException('You are already assigned to this learning path');

    const existingRequest = await this.db.learningPathJoinRequest.findUnique({
      where: { learningPathId_userId: { learningPathId, userId } },
    });
    if (existingRequest) {
      if (existingRequest.status === 'pending') throw new BadRequestException('Join request already pending');
      if (existingRequest.status === 'approved') throw new BadRequestException('You are already assigned to this learning path');
    }

    return this.db.learningPathJoinRequest.upsert({
      where: { learningPathId_userId: { learningPathId, userId } },
      create: { learningPathId, userId, status: 'pending', message },
      update: { status: 'pending', message, reviewedBy: null, reviewedAt: null },
    });
  }

  async getPendingJoinRequests(organizationId?: string) {
    const where: any = { status: 'pending' };
    if (organizationId) {
      const paths = await this.db.learningPath.findMany({ where: { organizationId }, select: { id: true } });
      where.learningPathId = { in: paths.map((p) => p.id) };
    }
    return this.db.learningPathJoinRequest.findMany({
      where,
      include: {
        learningPath: { select: { id: true, title: true, slug: true } },
        user: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async reviewJoinRequest(requestId: string, reviewerId: string, action: 'approved' | 'denied') {
    const req = await this.db.learningPathJoinRequest.findUnique({ where: { id: requestId }, include: { learningPath: true } });
    if (!req) throw new NotFoundException('Join request not found');
    if (req.status !== 'pending') throw new BadRequestException(`Request already ${req.status}`);

    const result = await this.db.$transaction(async (tx) => {
      const updated = await tx.learningPathJoinRequest.update({
        where: { id: requestId },
        data: { status: action, reviewedBy: reviewerId, reviewedAt: new Date() },
      });

      if (action === 'approved') {
        await tx.learningPathAssignment.create({
          data: {
            learningPathId: req.learningPathId,
            assigneeType: 'user',
            assigneeId: req.userId,
          },
        });
      }

      return updated;
    });

    return result;
  }
}
