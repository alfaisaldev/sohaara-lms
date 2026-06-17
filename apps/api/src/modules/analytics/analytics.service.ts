import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly db: DatabaseService) {}

  async getDashboardStats(organizationId: string | null) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const orgFilter = organizationId ? { organizationId } : {};
    const courseOrgFilter: any = organizationId ? { course: { organizationId } } : {};

    const [
      totalUsers, totalCourses, totalEnrollments, completedEnrollments,
      totalQuizzes, totalAssignments, totalOrganizations, totalCertificates,
      newUsers, newEnrollments, newCourses, activeUsersToday,
    ] = await Promise.all([
      this.db.user.count({ where: orgFilter }),
      this.db.course.count({ where: { ...orgFilter, deletedAt: null } }),
      this.db.enrollment.count({ where: courseOrgFilter }),
      this.db.enrollment.count({ where: { ...courseOrgFilter, status: 'completed' } }),
      this.db.quiz.count({ where: courseOrgFilter }),
      this.db.assignment.count({ where: courseOrgFilter }),
      this.db.organization.count(),
      this.db.certificate.count(),
      this.db.user.count({ where: { ...orgFilter, createdAt: { gte: thirtyDaysAgo } } }),
      this.db.enrollment.count({ where: { ...courseOrgFilter, startedAt: { gte: thirtyDaysAgo } } }),
      this.db.course.count({ where: { ...orgFilter, createdAt: { gte: thirtyDaysAgo }, deletedAt: null } }),
      this.db.auditLog.groupBy({ by: ['userId'], where: { createdAt: { gte: startOfDay } }, _count: { userId: true } })
        .then((groups) => Number(groups.length)),
    ]);

    return {
      totalUsers,
      totalOrganizations,
      totalCourses,
      totalEnrollments,
      totalCertificates,
      activeToday: activeUsersToday,
      completedEnrollments,
      completionRate: totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0,
      totalQuizzes,
      totalAssignments,
      usersChange: newUsers,
      coursesChange: newCourses,
      enrollmentsChange: newEnrollments,
    };
  }

  async getCourseAnalytics(courseId: string) {
    const [enrollments, completed, lessons] = await Promise.all([
      this.db.enrollment.findMany({ where: { courseId }, include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } }),
      this.db.enrollment.count({ where: { courseId, status: 'completed' } }),
      this.db.lesson.count({ where: { section: { module: { courseId } } } }),
    ]);

    const quizScores = await this.db.quizAttempt.findMany({
      where: { quiz: { courseId } },
      select: { score: true, maxScore: true, passed: true },
    });

    const avgScore = quizScores.length > 0
      ? Math.round(quizScores.reduce((sum, a) => sum + (a.maxScore > 0 ? (a.score / a.maxScore) * 100 : 0), 0) / quizScores.length)
      : 0;

    return {
      totalEnrollments: enrollments.length,
      completedCount: completed,
      completionRate: enrollments.length > 0 ? Math.round((completed / enrollments.length) * 100) : 0,
      totalLessons: lessons,
      quizAttempts: quizScores.length,
      averageScore: avgScore,
      passRate: quizScores.length > 0
        ? Math.round((quizScores.filter((a) => a.passed).length / quizScores.length) * 100)
        : 0,
      enrollments: enrollments.map((e) => ({
        id: e.id,
        user: e.user,
        status: e.status,
        progress: e.progress,
        startedAt: e.startedAt,
        completedAt: e.completedAt,
      })),
    };
  }

  async getUserAnalytics(userId: string) {
    const [enrollments, completedCourses, quizAttempts, submissions, completions] = await Promise.all([
      this.db.enrollment.findMany({ where: { userId }, include: { course: { select: { id: true, title: true, thumbnail: true } } } }),
      this.db.enrollment.count({ where: { userId, status: 'completed' } }),
      this.db.quizAttempt.findMany({ where: { userId }, select: { score: true, maxScore: true, passed: true } }),
      this.db.assignmentSubmission.findMany({ where: { userId }, select: { score: true, status: true } }),
      this.db.lessonCompletion.findMany({
        where: { userId, completed: true, completedAt: { not: null } },
        select: { completedAt: true },
        orderBy: { completedAt: 'desc' },
      }),
    ]);

    const avgQuizScore = quizAttempts.length > 0
      ? Math.round(quizAttempts.reduce((sum, a) => sum + (a.maxScore > 0 ? (a.score / a.maxScore) * 100 : 0), 0) / quizAttempts.length)
      : 0;

    const gradedSubmissions = submissions.filter((s) => s.score != null);
    const avgAssignmentScore = gradedSubmissions.length > 0
      ? Math.round(gradedSubmissions.reduce((sum, s) => sum + s.score!, 0) / gradedSubmissions.length)
      : 0;

    let dayStreak = 0;
    if (completions.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dates = completions.map((c) => {
        const d = new Date(c.completedAt!);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      });
      const uniqueDates = [...new Set(dates)].sort((a, b) => b - a);
      if (uniqueDates[0] === today.getTime() || uniqueDates[0] === today.getTime() - 86400000) {
        dayStreak = 1;
        const startFrom = uniqueDates[0] === today.getTime() ? 1 : 0;
        for (let i = startFrom; i < uniqueDates.length; i++) {
          const expected = uniqueDates[0] - i * 86400000;
          if (uniqueDates[i] === expected) {
            dayStreak++;
          } else {
            break;
          }
        }
      }
    }

    return {
      totalEnrollments: enrollments.length,
      completedCourses,
      inProgress: enrollments.filter((e) => e.status === 'active').length,
      completionRate: enrollments.length > 0 ? Math.round((completedCourses / enrollments.length) * 100) : 0,
      quizAttempts: quizAttempts.length,
      avgQuizScore,
      avgAssignmentScore,
      dayStreak,
      courses: enrollments.map((e) => ({
        id: e.course.id,
        title: e.course.title,
        status: e.status,
        progress: e.progress,
        completedAt: e.completedAt,
      })),
    };
  }

  async getSystemStats() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalUsers, totalCourses, totalEnrollments, activeEnrollments, newUsers, newEnrollments, recentActivity] = await Promise.all([
      this.db.user.count(),
      this.db.course.count(),
      this.db.enrollment.count(),
      this.db.enrollment.count({ where: { status: 'active' } }),
      this.db.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.db.enrollment.count({ where: { startedAt: { gte: thirtyDaysAgo } } }),
      this.db.auditLog.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
    ]);

    return {
      totalUsers,
      totalCourses,
      totalEnrollments,
      activeEnrollments,
      newUsers30d: newUsers,
      newEnrollments30d: newEnrollments,
      recentActivity30d: recentActivity,
    };
  }
}
