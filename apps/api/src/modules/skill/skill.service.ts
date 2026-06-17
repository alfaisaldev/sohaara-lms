import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class SkillService {
  constructor(private readonly db: DatabaseService) {}

  async getCategories(organizationId: string) {
    return this.db.skillCategory.findMany({
      where: { organizationId },
      include: { skills: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createCategory(data: { organizationId: string; name: string; description?: string; icon?: string }) {
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return this.db.skillCategory.create({
      data: { ...data, slug: `${slug}-${Date.now().toString(36)}` },
    });
  }

  async updateCategory(id: string, data: any) {
    const cat = await this.db.skillCategory.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');
    return this.db.skillCategory.update({ where: { id }, data });
  }

  async deleteCategory(id: string) {
    await this.db.skillCategory.delete({ where: { id } });
    return { message: 'Category deleted' };
  }

  async createSkill(data: {
    categoryId: string;
    name: string;
    description?: string;
    level?: string;
  }) {
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return this.db.skill.create({
      data: { ...data, slug: `${slug}-${Date.now().toString(36)}` },
    });
  }

  async updateSkill(id: string, data: any) {
    const skill = await this.db.skill.findUnique({ where: { id } });
    if (!skill) throw new NotFoundException('Skill not found');
    return this.db.skill.update({ where: { id }, data });
  }

  async deleteSkill(id: string) {
    await this.db.skill.delete({ where: { id } });
    return { message: 'Skill deleted' };
  }

  async getUserSkills(userId: string) {
    return this.db.userSkill.findMany({
      where: { userId },
      include: { skill: { include: { category: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async setUserSkill(userId: string, skillId: string, data: {
    score?: number;
    level?: string;
    assessed?: boolean;
  }) {
    return this.db.userSkill.upsert({
      where: { userId_skillId: { userId, skillId } },
      create: { userId, skillId, score: data.score ?? 0, level: data.level ?? 'beginner', assessed: data.assessed ?? false },
      update: { score: data.score, level: data.level, assessed: data.assessed },
    });
  }
}
