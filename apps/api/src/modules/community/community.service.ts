import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class CommunityService {
  constructor(private readonly db: DatabaseService) {}

  async getPosts(courseId?: string, organizationId?: string) {
    return this.db.discussionPost.findMany({
      where: courseId ? { courseId } : organizationId ? { organizationId } : {},
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        _count: { select: { replies: true } },
      },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async getPost(id: string) {
    const post = await this.db.discussionPost.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        replies: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { id: true, firstName: true, lastName: true, avatar: true } },
            children: {
              include: {
                author: { select: { id: true, firstName: true, lastName: true, avatar: true } },
              },
            },
          },
        },
      },
    });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  async createPost(data: {
    authorId: string;
    title: string;
    content: string;
    courseId?: string;
    organizationId?: string;
    tags?: string[];
  }) {
    return this.db.discussionPost.create({
      data: {
        authorId: data.authorId,
        title: data.title,
        content: data.content,
        courseId: data.courseId,
        organizationId: data.organizationId,
        tags: data.tags || [],
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
    });
  }

  async updatePost(id: string, data: any) {
    const post = await this.db.discussionPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    return this.db.discussionPost.update({ where: { id }, data });
  }

  async deletePost(id: string) {
    await this.db.discussionPost.delete({ where: { id } });
    return { message: 'Post deleted' };
  }

  async togglePin(id: string) {
    const post = await this.db.discussionPost.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');
    return this.db.discussionPost.update({ where: { id }, data: { pinned: !post.pinned } });
  }

  async addReply(data: {
    postId: string;
    authorId: string;
    content: string;
    parentId?: string;
  }) {
    return this.db.discussionReply.create({
      data,
      include: {
        author: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
    });
  }

  async deleteReply(id: string) {
    await this.db.discussionReply.delete({ where: { id } });
    return { message: 'Reply deleted' };
  }
}
