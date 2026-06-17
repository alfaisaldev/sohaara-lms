import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AssignmentService {
  constructor(private readonly db: DatabaseService) {}

  async findByCourse(courseId: string) {
    return this.db.assignment.findMany({
      where: { courseId, status: { not: 'archived' } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const assignment = await this.db.assignment.findUnique({ where: { id } });
    if (!assignment) throw new NotFoundException('Assignment not found');
    return assignment;
  }

  async create(data: {
    courseId: string;
    title: string;
    description?: string;
    instructions?: string;
    dueDate?: string;
    maxScore?: number;
    passingScore?: number;
    allowLateSubmission?: boolean;
    maxAttempts?: number;
    submissionType?: string;
  }) {
    return this.db.assignment.create({
      data: {
        courseId: data.courseId,
        title: data.title,
        description: data.description,
        instructions: data.instructions,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        maxScore: data.maxScore ?? 100,
        passingScore: data.passingScore ?? 60,
        allowLateSubmission: data.allowLateSubmission ?? false,
        maxAttempts: data.maxAttempts ?? 1,
        submissionType: data.submissionType ?? 'any',
      },
    });
  }

  async update(id: string, data: any) {
    const assignment = await this.db.assignment.findUnique({ where: { id } });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (data.dueDate) data.dueDate = new Date(data.dueDate);
    return this.db.assignment.update({ where: { id }, data });
  }

  async delete(id: string) {
    await this.db.assignment.update({ where: { id }, data: { status: 'archived' } });
    return { message: 'Assignment archived' };
  }

  async submit(userId: string, assignmentId: string, enrollmentId: string, data: {
    content?: string;
    files?: Array<{ fileName: string; fileUrl: string; fileSize: number; mimeType: string }>;
    links?: string[];
  }) {
    const assignment = await this.db.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Assignment not found');

    const submissionCount = await this.db.assignmentSubmission.count({
      where: { assignmentId, userId },
    });

    if (assignment.maxAttempts > 0 && submissionCount >= assignment.maxAttempts) {
      throw new Error('Maximum submission attempts reached');
    }

    return this.db.assignmentSubmission.create({
      data: {
        assignmentId,
        userId,
        enrollmentId,
        content: data.content,
        files: data.files || [],
        links: data.links || [],
        attemptNumber: submissionCount + 1,
      },
    });
  }

  async getSubmissions(assignmentId: string) {
    return this.db.assignmentSubmission.findMany({
      where: { assignmentId },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true } } },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async getMySubmission(assignmentId: string, userId: string) {
    return this.db.assignmentSubmission.findFirst({
      where: { assignmentId, userId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async gradeSubmission(submissionId: string, data: { score: number; feedback?: string }, gradedBy: string) {
    const submission = await this.db.assignmentSubmission.findUnique({ where: { id: submissionId } });
    if (!submission) throw new NotFoundException('Submission not found');

    const assignment = await this.db.assignment.findUnique({ where: { id: submission.assignmentId } });
    if (!assignment) throw new NotFoundException('Assignment not found');

    if (data.score > assignment.maxScore) {
      throw new Error(`Score cannot exceed ${assignment.maxScore}`);
    }

    return this.db.assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        score: data.score,
        feedback: data.feedback,
        gradedBy,
        gradedAt: new Date(),
        status: 'graded',
      },
    });
  }

  async addRubricItem(assignmentId: string, data: { criterion: string; description?: string; maxScore: number; weight: number }) {
    const assignment = await this.db.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Assignment not found');

    const rubric = Array.isArray(assignment.rubric) ? assignment.rubric : [];
    const newItem = { id: `rubric-${Date.now()}`, ...data };

    return this.db.assignment.update({
      where: { id: assignmentId },
      data: { rubric: [...rubric, newItem] },
    });
  }
}
