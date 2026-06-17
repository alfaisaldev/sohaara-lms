import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ReportsService {
  constructor(private readonly db: DatabaseService) {}

  async getLearners(format?: string) {
    const users = await this.db.user.findMany({
      where: {
        deletedAt: null,
        roleAssignments: { some: { role: { slug: 'learner' } } },
      },
      select: {
        id: true, firstName: true, lastName: true, email: true,
        status: true, createdAt: true, lastLoginAt: true,
        roleAssignments: {
          select: { role: { select: { name: true, slug: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = users.map((u) => ({
      id: u.id, firstName: u.firstName, lastName: u.lastName,
      email: u.email, status: u.status,
      role: u.roleAssignments[0]?.role?.name || 'Learner',
      joined: u.createdAt, lastLogin: u.lastLoginAt,
    }));

    return format === 'csv' ? this.toCsv(data) : data;
  }

  async getCourses(format?: string) {
    const courses = await this.db.course.findMany({
      where: { deletedAt: null },
      include: {
        _count: { select: { enrollments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const completedCounts = await Promise.all(
      courses.map((c) =>
        this.db.enrollment.count({ where: { courseId: c.id, status: 'completed' } })
      ),
    );

    const data = courses.map((c, i) => ({
      id: c.id, title: c.title, status: c.status, level: c.level,
      enrollments: c._count.enrollments, completed: completedCounts[i],
      createdAt: c.createdAt,
    }));

    return format === 'csv' ? this.toCsv(data) : data;
  }

  async getEnrollments(format?: string) {
    const enrollments = await this.db.enrollment.findMany({
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        course: { select: { id: true, title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const data = enrollments.map((e) => ({
      id: e.id, user: `${e.user.firstName} ${e.user.lastName}`,
      email: e.user.email, course: e.course.title,
      status: e.status, progress: e.progress,
      startedAt: e.startedAt, completedAt: e.completedAt,
    }));

    return format === 'csv' ? this.toCsv(data) : data;
  }

  async getCertificates(format?: string) {
    const certs = await this.db.certificate.findMany({
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        course: { select: { id: true, title: true } },
      },
      orderBy: { issuedAt: 'desc' },
    });

    const data = certs.map((c) => ({
      id: c.id, certificateNumber: c.certificateNumber,
      user: `${c.user.firstName} ${c.user.lastName}`,
      email: c.user.email, course: c.course.title,
      status: c.status, issuedAt: c.issuedAt, expiresAt: c.expiresAt,
    }));

    return format === 'csv' ? this.toCsv(data) : data;
  }

  private toCsv(data: Record<string, any>[]): string {
    if (!data || data.length === 0) return '';
    const first = data[0] as Record<string, any>;
    const headers = Object.keys(first);
    const rows = data.map((row) =>
      headers.map((h) => {
        const val = row[h];
        if (val == null) return '';
        const str = String(val);
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(','),
    );
    return [headers.join(','), ...rows].join('\n');
  }
}
