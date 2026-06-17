export type QuestionType = 'multiple_choice' | 'multiple_select' | 'true_false' | 'fill_blank' | 'matching' | 'short_answer' | 'essay';
export interface Quiz {
    id: string;
    courseId: string;
    title: string;
    description?: string;
    instructions?: string;
    timeLimit?: number;
    passingScore: number;
    maxAttempts: number;
    shuffleQuestions: boolean;
    shuffleAnswers: boolean;
    showResults: boolean;
    showCorrectAnswers: boolean;
    questions: Question[];
    status: ContentStatus;
    createdAt: Date;
    updatedAt: Date;
}
export interface Question {
    id: string;
    quizId: string;
    type: QuestionType;
    title: string;
    description?: string;
    points: number;
    sortOrder: number;
    options: QuestionOption[];
    correctAnswer?: string;
    correctAnswers?: string[];
    matchingPairs?: MatchingPair[];
    explanation?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface QuestionOption {
    id: string;
    questionId: string;
    text: string;
    isCorrect: boolean;
    sortOrder: number;
}
export interface MatchingPair {
    id: string;
    questionId: string;
    left: string;
    right: string;
}
export interface QuizAttempt {
    id: string;
    userId: string;
    quizId: string;
    enrollmentId: string;
    score: number;
    maxScore: number;
    percentage: number;
    passed: boolean;
    answers: QuizAnswer[];
    startedAt: Date;
    completedAt?: Date;
    timeSpent?: number;
    attemptNumber: number;
    createdAt: Date;
}
export interface QuizAnswer {
    id: string;
    attemptId: string;
    questionId: string;
    answer?: string;
    answers?: string[];
    matchingAnswer?: Record<string, string>;
    isCorrect: boolean;
    points: number;
    maxPoints: number;
    feedback?: string;
}
export interface QuestionBank {
    id: string;
    organizationId: string;
    name: string;
    description?: string;
    questions: Question[];
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
}
