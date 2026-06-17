import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { CoursesModule } from './modules/courses/courses.module';
import { CurriculumModule } from './modules/curriculum/curriculum.module';
import { EnrollmentsModule } from './modules/enrollments/enrollments.module';
import { QuizModule } from './modules/quiz/quiz.module';
import { AssignmentModule } from './modules/assignment/assignment.module';
import { CertificateModule } from './modules/certificate/certificate.module';
import { LearningPathModule } from './modules/learning-path/learning-path.module';
import { SkillModule } from './modules/skill/skill.module';
import { ResourceModule } from './modules/resource/resource.module';
import { CommunityModule } from './modules/community/community.module';
import { BlogModule } from './modules/blog/blog.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AiModule } from './modules/ai/ai.module';
import { SearchModule } from './modules/search/search.module';
import { NotificationsModule } from './modules/notifications/notification.module';
import { MediaModule } from './modules/media/media.module';
import { ScormModule } from './modules/scorm/scorm.module';
import { AuditLogModule } from './modules/audit/audit.module';
import { AppLogsModule } from './modules/app-logs/app-logs.module';
import { ReportsModule } from './modules/reports/reports.module';
import { HealthModule } from './modules/health/health.module';
import { DatabaseModule } from './modules/database/database.module';
import { ConfigModule } from './modules/config/config.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    ConfigModule,
    DatabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    CoursesModule,
    CurriculumModule,
    EnrollmentsModule,
    QuizModule,
    AssignmentModule,
    CertificateModule,
    LearningPathModule,
    SkillModule,
    ResourceModule,
    CommunityModule,
    BlogModule,
    AnalyticsModule,
    AiModule,
    SearchModule,
    NotificationsModule,
    MediaModule,
    ScormModule,
    ReportsModule,
    AuditLogModule,
    AppLogsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
