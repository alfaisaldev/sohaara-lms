export interface CourseAnalytics {
    courseId: string;
    totalEnrollments: number;
    activeEnrollments: number;
    completions: number;
    completionRate: number;
    averageProgress: number;
    averageScore: number;
    totalWatchTime: number;
    averageWatchTime: number;
    dropoffRate: number;
    ratings: number[];
    averageRating: number;
}
export interface UserAnalytics {
    userId: string;
    totalCourses: number;
    completedCourses: number;
    completionRate: number;
    averageScore: number;
    totalWatchTime: number;
    totalTimeSpent: number;
    certificatesEarned: number;
    skillsAcquired: number;
    loginStreak: number;
    lastActivity: Date;
}
export interface OrganizationAnalytics {
    organizationId: string;
    totalUsers: number;
    activeUsers: number;
    totalCourses: number;
    publishedCourses: number;
    totalEnrollments: number;
    completions: number;
    completionRate: number;
    averageScore: number;
    certificatesIssued: number;
    storageUsed: number;
}
export interface Report {
    id: string;
    organizationId?: string;
    name: string;
    type: ReportType;
    filters: Record<string, unknown>;
    schedule?: ReportSchedule;
    format: 'pdf' | 'csv' | 'xlsx' | 'json';
    lastGenerated?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export type ReportType = 'course_completion' | 'user_activity' | 'assessment_results' | 'certificate_report' | 'compliance_report' | 'skill_report' | 'engagement_report' | 'custom';
export interface ReportSchedule {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    day?: number;
    time: string;
    recipients: string[];
    nextRun: Date;
}
