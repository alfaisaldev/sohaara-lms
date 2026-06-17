import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class SearchService {
  constructor(private readonly db: DatabaseService) {}

  async searchAll(query: string, organizationId?: string) {
    if (!query || query.length < 2) return { courses: [], users: [], posts: [], resources: [] };

    const orgFilter = organizationId ? { organizationId } : {};

    const [courses, users, posts, resources] = await Promise.all([
      this.db.course.findMany({
        where: {
          ...orgFilter,
          OR: [
            { title: { contains: query } },
            { description: { contains: query } },
          ],
        },
        select: { id: true, title: true, thumbnail: true, status: true },
        take: 10,
      }),
      this.db.user.findMany({
        where: {
          ...orgFilter,
          OR: [
            { firstName: { contains: query } },
            { lastName: { contains: query } },
            { email: { contains: query } },
          ],
        },
        select: { id: true, firstName: true, lastName: true, email: true, avatar: true },
        take: 10,
      }),
      this.db.discussionPost.findMany({
        where: {
          OR: [
            { title: { contains: query } },
            { content: { contains: query } },
          ],
        },
        select: { id: true, title: true, createdAt: true },
        take: 10,
      }),
      this.db.courseResource.findMany({
        where: {
          OR: [
            { title: { contains: query } },
            { description: { contains: query } },
          ],
        },
        select: { id: true, title: true, type: true, courseId: true },
        take: 10,
      }),
    ]);

    return { courses, users, posts, resources };
  }

  async searchCourses(query: string, organizationId?: string) {
    const orgFilter = organizationId ? { organizationId } : {};
    return this.db.course.findMany({
      where: {
        ...orgFilter,
        OR: [
          { title: { contains: query } },
          { description: { contains: query } },
        ],
      },
      take: 20,
    });
  }
}
