export type LessonType = 'video' | 'text' | 'audio' | 'pdf' | 'presentation' | 'resource' | 'embed' | 'assignment' | 'quiz' | 'live_session' | 'external';
export interface Lesson {
    id: string;
    sectionId: string;
    title: string;
    slug: string;
    description?: string;
    type: LessonType;
    content?: string;
    duration?: number;
    sortOrder: number;
    status: ContentStatus;
    isFree: boolean;
    isRequired: boolean;
    videoUrl?: string;
    videoDuration?: number;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    embedUrl?: string;
    externalUrl?: string;
    assignmentId?: string;
    quizId?: string;
    liveSessionId?: string;
    resources: LessonResource[];
    createdAt: Date;
    updatedAt: Date;
}
export interface LessonResource {
    id: string;
    lessonId: string;
    title: string;
    type: string;
    url: string;
    fileSize?: number;
    sortOrder: number;
    createdAt: Date;
}
export interface LessonCompletion {
    id: string;
    userId: string;
    lessonId: string;
    enrollmentId: string;
    completed: boolean;
    timeSpent?: number;
    watchProgress?: number;
    score?: number;
    completedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface Bookmark {
    id: string;
    userId: string;
    lessonId: string;
    timestamp?: number;
    note?: string;
    createdAt: Date;
}
export interface Note {
    id: string;
    userId: string;
    lessonId: string;
    content: string;
    timestamp?: number;
    createdAt: Date;
    updatedAt: Date;
}
