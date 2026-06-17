import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class NotificationService {
  constructor(private readonly db: DatabaseService) {}

  async findByUser(userId: string) {
    return this.db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getUnreadCount(userId: string) {
    return this.db.notification.count({ where: { userId, read: false } });
  }

  async markRead(id: string) {
    const notif = await this.db.notification.findUnique({ where: { id } });
    if (!notif) throw new NotFoundException('Notification not found');
    return this.db.notification.update({ where: { id }, data: { read: true, readAt: new Date() } });
  }

  async markAllRead(userId: string) {
    await this.db.notification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() },
    });
    return { message: 'All notifications marked as read' };
  }

  async create(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    data?: any;
  }) {
    return this.db.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data || {},
      },
    });
  }

  async getPreferences(userId: string) {
    return this.db.notificationPreferences.findUnique({ where: { userId } });
  }

  async updatePreferences(userId: string, data: { email?: boolean; inApp?: boolean; digest?: boolean }) {
    return this.db.notificationPreferences.upsert({
      where: { userId },
      create: { userId, email: data.email ?? true, inApp: data.inApp ?? true, digest: data.digest ?? false },
      update: data,
    });
  }

  async delete(id: string) {
    await this.db.notification.delete({ where: { id } });
    return { message: 'Notification deleted' };
  }
}
