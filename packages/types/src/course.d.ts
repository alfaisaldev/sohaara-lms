export interface Course {
    id: string;
    organizationId: string;
    title: string;
    slug: string;
    subtitle?: string;
    description?: string;
    excerpt?: string;
    thumbnail?: string;
    cover?: string;
    categoryId?: string;
    tags: string[];
    level: 'beginner' | 'intermediate' | 'advanced' | 'all';
    language: string;
    duration?: number;
    estimatedHours?: number;
    status: ContentStatus;
    featured: boolean;
    popular: boolean;
    paid: boolean;
    price?: number;
    currency: string;
    hasCertificate: boolean;
    certificateTemplateId?: string;
    seoTitle?: string;
    seoDescription?: string;
    seoKeywords: string[];
    createdById: string;
    publishedAt?: Date;
    scheduledAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface CourseCategory {
    id: string;
    organizationId?: string;
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    color?: string;
    parentId?: string;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface CourseModule {
    id: string;
    courseId: string;
    title: string;
    description?: string;
    sortOrder: number;
    status: ContentStatus;
    sections: CourseSection[];
    createdAt: Date;
    updatedAt: Date;
}
export interface CourseSection {
    id: string;
    moduleId: string;
    title: string;
    description?: string;
    sortOrder: number;
    status: ContentStatus;
    lessons: Lesson[];
    createdAt: Date;
    updatedAt: Date;
}
export type ContentStatus = 'draft' | 'published' | 'archived' | 'scheduled';
export interface LearningPath {
    id: string;
    organizationId: string;
    title: string;
    slug: string;
    description?: string;
    thumbnail?: string;
    status: ContentStatus;
    courses: string[];
    prerequisites: string[];
    estimatedHours?: number;
    targetAudience?: string;
    isMandatory: boolean;
    deadline?: Date;
    createdAt: Date;
    updatedAt: Date;
    coursesRelation?: LearningPathCourse[];
    assignments?: LearningPathAssignment[];
    progress?: LearningPathProgress[];
}

export interface LearningPathCourse {
    id: string;
    learningPathId: string;
    courseId: string;
    sortOrder: number;
    isMandatory: boolean;
    prerequisites: string[];
    createdAt: Date;
    course?: Course;
}

export interface LearningPathAssignment {
    id: string;
    learningPathId: string;
    assigneeType: 'user' | 'group' | 'role';
    assigneeId: string;
    createdAt: Date;
}

export interface LearningPathProgress {
    id: string;
    userId: string;
    learningPathId: string;
    progress: number;
    completedCourses: string[];
    startedAt: Date;
    completedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface Enrollment {
    id: string;
    userId: string;
    courseId: string;
    status: 'active' | 'completed' | 'dropped' | 'expired';
    progress: number;
    startedAt: Date;
    completedAt?: Date;
    expiresAt?: Date;
    certificateId?: string;
    createdAt: Date;
    updatedAt: Date;
}
