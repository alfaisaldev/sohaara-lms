export interface Assignment {
    id: string;
    courseId: string;
    title: string;
    description?: string;
    instructions?: string;
    dueDate?: Date;
    maxScore: number;
    passingScore: number;
    allowLateSubmission: boolean;
    maxAttempts: number;
    submissionType: 'text' | 'file' | 'link' | 'any';
    rubric: RubricItem[];
    status: ContentStatus;
    createdAt: Date;
    updatedAt: Date;
}
export interface RubricItem {
    id: string;
    assignmentId: string;
    criterion: string;
    description?: string;
    maxScore: number;
    weight: number;
}
export interface AssignmentSubmission {
    id: string;
    assignmentId: string;
    userId: string;
    enrollmentId: string;
    content?: string;
    files: SubmissionFile[];
    links: string[];
    attemptNumber: number;
    status: 'submitted' | 'graded' | 'returned' | 'resubmitted';
    score?: number;
    feedback?: string;
    gradedBy?: string;
    gradedAt?: Date;
    submittedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface SubmissionFile {
    id: string;
    submissionId: string;
    fileName: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
    uploadedAt: Date;
}
