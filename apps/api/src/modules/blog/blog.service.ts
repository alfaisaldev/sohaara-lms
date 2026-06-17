import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class BlogService {
  constructor(private readonly db: DatabaseService) {}

  async getPosts(organizationId?: string, status?: string) {
    return this.db.blogPost.findMany({
      where: organizationId ? { organizationId, ...(status ? { status } : { status: 'published' }) } : {},
      include: {
        category: true,
        author: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
      orderBy: { publishedAt: 'desc' },
    });
  }

  async getPost(id: string) {
    const post = await this.db.blogPost.findUnique({
      where: { id },
      include: {
        category: true,
        author: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
    });
    if (!post) throw new NotFoundException('Blog post not found');
    return post;
  }

  async create(data: {
    organizationId: string;
    authorId: string;
    title: string;
    content: string;
    excerpt?: string;
    coverImage?: string;
    categoryId?: string;
    tags?: string[];
    status?: string;
    seoTitle?: string;
    seoDescription?: string;
  }) {
    const slug = data.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36);
    return this.db.blogPost.create({
      data: {
        ...data,
        slug,
        tags: data.tags || [],
        status: data.status || 'draft',
        publishedAt: data.status === 'published' ? new Date() : undefined,
      },
      include: {
        category: true,
        author: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
    });
  }

  async update(id: string, data: any) {
    const post = await this.db.blogPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Blog post not found');
    if (data.status === 'published' && post.status !== 'published') {
      data.publishedAt = new Date();
    }
    return this.db.blogPost.update({ where: { id }, data });
  }

  async delete(id: string) {
    await this.db.blogPost.delete({ where: { id } });
    return { message: 'Post deleted' };
  }

  async getCategories() {
    return this.db.blogCategory.findMany({ orderBy: { name: 'asc' } });
  }

  async createCategory(data: { name: string; description?: string }) {
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return this.db.blogCategory.create({ data: { ...data, slug } });
  }

  async updateCategory(id: string, data: any) {
    const cat = await this.db.blogCategory.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Category not found');
    return this.db.blogCategory.update({ where: { id }, data });
  }

  async deleteCategory(id: string) {
    await this.db.blogCategory.delete({ where: { id } });
    return { message: 'Category deleted' };
  }
}
