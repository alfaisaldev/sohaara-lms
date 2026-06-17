import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ResourceService {
  constructor(private readonly db: DatabaseService) {}

  async findByCourse(courseId: string) {
    return this.db.courseResource.findMany({
      where: { courseId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findById(id: string) {
    const resource = await this.db.courseResource.findUnique({ where: { id } });
    if (!resource) throw new NotFoundException('Resource not found');
    return resource;
  }

  async create(data: {
    courseId: string;
    title: string;
    description?: string;
    type: string;
    url: string;
    fileSize?: number;
    tags?: string[];
  }) {
    const count = await this.db.courseResource.count({ where: { courseId: data.courseId } });
    return this.db.courseResource.create({
      data: { ...data, sortOrder: count, tags: data.tags || [] },
    });
  }

  async update(id: string, data: any) {
    const resource = await this.db.courseResource.findUnique({ where: { id } });
    if (!resource) throw new NotFoundException('Resource not found');
    return this.db.courseResource.update({ where: { id }, data });
  }

  async delete(id: string) {
    await this.db.courseResource.delete({ where: { id } });
    return { message: 'Resource deleted' };
  }
}
