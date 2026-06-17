export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
}

export type NotificationType =
  | 'course_enrolled'
  | 'course_completed'
  | 'lesson_completed'
  | 'quiz_graded'
  | 'assignment_graded'
  | 'certificate_issued'
  | 'certificate_expiring'
  | 'course_due'
  | 'course_expiring'
  | 'achievement_unlocked'
  | 'announcement'
  | 'system'
  | 'discussion_reply'
  | 'mention'
  | 'invitation'
  | 'role_changed'
  | 'account_verified'
  | 'password_changed'
  | 'login_alert';

export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  subject: string;
  body: string;
  variables: string[];
  channels: ('email' | 'in_app' | 'sms')[];
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPreferences {
  id: string;
  userId: string;
  email: boolean;
  inApp: boolean;
  digest: boolean;
  preferences: Record<NotificationType, { email: boolean; in_app: boolean }>;
  createdAt: Date;
  updatedAt: Date;
}
