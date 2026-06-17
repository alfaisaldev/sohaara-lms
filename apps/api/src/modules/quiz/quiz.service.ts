import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class QuizService {
  constructor(private readonly db: DatabaseService) {}

  // ─── Quiz CRUD ───

  async findByCourse(courseId: string) {
    return this.db.quiz.findMany({
      where: { courseId, status: { not: 'archived' } },
      include: { questions: { orderBy: { sortOrder: 'asc' }, include: { options: { orderBy: { sortOrder: 'asc' } }, matchingPairs: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const quiz = await this.db.quiz.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { sortOrder: 'asc' },
          include: { options: { orderBy: { sortOrder: 'asc' } }, matchingPairs: true },
        },
      },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');
    return quiz;
  }

  async create(data: {
    courseId: string;
    title: string;
    description?: string;
    instructions?: string;
    timeLimit?: number;
    passingScore?: number;
    maxAttempts?: number;
    shuffleQuestions?: boolean;
    shuffleAnswers?: boolean;
    showResults?: boolean;
    showCorrectAnswers?: boolean;
  }) {
    return this.db.quiz.create({ data });
  }

  async update(id: string, data: any) {
    const quiz = await this.db.quiz.findUnique({ where: { id } });
    if (!quiz) throw new NotFoundException('Quiz not found');
    return this.db.quiz.update({ where: { id }, data });
  }

  async delete(id: string) {
    await this.db.quiz.update({ where: { id }, data: { status: 'archived' } });
    return { message: 'Quiz archived' };
  }

  // ─── Questions ───

  async addQuestion(quizId: string, data: {
    type: string;
    title: string;
    description?: string;
    points: number;
    options?: Array<{ text: string; isCorrect: boolean }>;
    correctAnswer?: string;
    correctAnswers?: string[];
    matchingPairs?: Array<{ left: string; right: string }>;
    explanation?: string;
  }) {
    const quiz = await this.db.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) throw new NotFoundException('Quiz not found');

    const maxSort = await this.db.question.aggregate({ where: { quizId }, _max: { sortOrder: true } });

    return this.db.question.create({
      data: {
        quizId,
        type: data.type,
        title: data.title,
        description: data.description,
        points: data.points,
        correctAnswer: data.correctAnswer,
        correctAnswers: data.correctAnswers || [],
        explanation: data.explanation,
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
        options: data.options ? { create: data.options.map((o, i) => ({ text: o.text, isCorrect: o.isCorrect, sortOrder: i })) } : undefined,
        matchingPairs: data.matchingPairs ? { create: data.matchingPairs.map((p) => ({ left: p.left, right: p.right })) } : undefined,
      },
      include: { options: { orderBy: { sortOrder: 'asc' } }, matchingPairs: true },
    });
  }

  async updateQuestion(id: string, data: any) {
    const question = await this.db.question.findUnique({ where: { id } });
    if (!question) throw new NotFoundException('Question not found');

    if (data.options) {
      await this.db.questionOption.deleteMany({ where: { questionId: id } });
    }
    if (data.matchingPairs) {
      await this.db.matchingPair.deleteMany({ where: { questionId: id } });
    }

    return this.db.question.update({
      where: { id },
      data: {
        type: data.type,
        title: data.title,
        description: data.description,
        points: data.points,
        correctAnswer: data.correctAnswer,
        correctAnswers: data.correctAnswers,
        explanation: data.explanation,
        options: data.options ? { create: data.options.map((o, i) => ({ text: o.text, isCorrect: o.isCorrect, sortOrder: i })) } : undefined,
        matchingPairs: data.matchingPairs ? { create: data.matchingPairs.map((p) => ({ left: p.left, right: p.right })) } : undefined,
      },
      include: { options: { orderBy: { sortOrder: 'asc' } }, matchingPairs: true },
    });
  }

  async deleteQuestion(id: string) {
    await this.db.question.delete({ where: { id } });
    return { message: 'Question deleted' };
  }

  async reorderQuestions(quizId: string, questionIds: string[]) {
    await this.db.$transaction(questionIds.map((id, i) =>
      this.db.question.update({ where: { id }, data: { sortOrder: i } }),
    ));
    return this.db.question.findMany({
      where: { quizId },
      orderBy: { sortOrder: 'asc' },
      include: { options: { orderBy: { sortOrder: 'asc' } }, matchingPairs: true },
    });
  }

  // ─── Attempt Engine ───

  async startAttempt(userId: string, quizId: string, enrollmentId: string) {
    const quiz = await this.db.quiz.findUnique({
      where: { id: quizId },
      include: { _count: { select: { attempts: { where: { userId } } } } },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');
    if (quiz.maxAttempts > 0 && quiz._count.attempts >= quiz.maxAttempts) {
      throw new ForbiddenException('Maximum attempts reached');
    }

    const attemptNumber = quiz._count.attempts + 1;

    return this.db.quizAttempt.create({
      data: { userId, quizId, enrollmentId, attemptNumber },
    });
  }

  async submitAnswer(attemptId: string, userId: string, data: {
    questionId: string;
    answer?: string;
    answers?: string[];
    matchingAnswer?: Record<string, string>;
  }) {
    const attempt = await this.db.quizAttempt.findFirst({
      where: { id: attemptId, userId, completedAt: null },
    });
    if (!attempt) throw new NotFoundException('Attempt not found or already completed');

    const question = await this.db.question.findUnique({
      where: { id: data.questionId },
      include: { options: true, matchingPairs: true },
    });
    if (!question) throw new NotFoundException('Question not found');

    const { isCorrect, points } = this.gradeQuestion(question, data);

    return this.db.quizAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId: data.questionId } },
      update: { answer: data.answer, answers: data.answers, matchingAnswer: data.matchingAnswer, isCorrect, points, maxPoints: question.points },
      create: { attemptId, questionId: data.questionId, answer: data.answer, answers: data.answers, matchingAnswer: data.matchingAnswer, isCorrect, points, maxPoints: question.points },
    });
  }

  async submitAttempt(attemptId: string, userId: string) {
    const attempt = await this.db.quizAttempt.findFirst({
      where: { id: attemptId, userId, completedAt: null },
      include: { quiz: true, answers: true },
    });
    if (!attempt) throw new NotFoundException('Attempt not found or already completed');

    const totalQuestions = await this.db.question.count({ where: { quizId: attempt.quizId } });
    const answeredQuestions = attempt.answers.length;

    if (answeredQuestions < totalQuestions) {
      throw new BadRequestException(`Answer all questions first (${answeredQuestions}/${totalQuestions})`);
    }

    const totalScore = attempt.answers.reduce((sum, a) => sum + a.points, 0);
    const maxScore = attempt.answers.reduce((sum, a) => sum + a.maxPoints, 0);
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const passed = percentage >= attempt.quiz.passingScore;

    const timeSpent = Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000);

    return this.db.quizAttempt.update({
      where: { id: attemptId },
      data: {
        score: totalScore,
        maxScore,
        percentage,
        passed,
        completedAt: new Date(),
        timeSpent,
      },
      include: { answers: true, quiz: true },
    });
  }

  async getAttempts(userId: string, quizId: string) {
    return this.db.quizAttempt.findMany({
      where: { userId, quizId },
      include: { answers: { include: { question: { select: { id: true, title: true, type: true, points: true, explanation: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAttempt(id: string, userId: string) {
    const attempt = await this.db.quizAttempt.findFirst({
      where: { id, userId },
      include: {
        quiz: { include: { questions: { include: { options: true } } } },
        answers: true,
      },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    return attempt;
  }

  // ─── Auto-grading ───

  private gradeQuestion(question: any, answer: { answer?: string; answers?: string[]; matchingAnswer?: Record<string, string> }): { isCorrect: boolean; points: number } {
    switch (question.type) {
      case 'multiple_choice': {
        const correct = question.options?.find((o: any) => o.isCorrect);
        return { isCorrect: answer.answer === correct?.id, points: answer.answer === correct?.id ? question.points : 0 };
      }
      case 'true_false': {
        return { isCorrect: answer.answer === question.correctAnswer, points: answer.answer === question.correctAnswer ? question.points : 0 };
      }
      case 'multiple_select': {
        const correctIds = question.options?.filter((o: any) => o.isCorrect).map((o: any) => o.id).sort();
        const userIds = (answer.answers || []).sort();
        const isCorrect = JSON.stringify(correctIds) === JSON.stringify(userIds);
        return { isCorrect, points: isCorrect ? question.points : 0 };
      }
      case 'fill_blank': {
        const isCorrect = answer.answer?.toLowerCase().trim() === question.correctAnswer?.toLowerCase().trim();
        return { isCorrect, points: isCorrect ? question.points : 0 };
      }
      case 'matching': {
        if (!answer.matchingAnswer || !question.matchingPairs) {
          return { isCorrect: false, points: 0 };
        }
        const correct = question.matchingPairs.every((pair: any) =>
          answer.matchingAnswer?.[pair.id] === pair.right,
        );
        return { isCorrect: correct, points: correct ? question.points : 0 };
      }
      case 'short_answer':
      case 'essay':
        return { isCorrect: false, points: 0 }; // requires manual grading
      default:
        return { isCorrect: false, points: 0 };
    }
  }

  // ─── Question Banks ───

  async getQuestionBanks(organizationId: string) {
    return this.db.questionBank.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' } });
  }

  async createQuestionBank(data: { organizationId: string; name: string; description?: string; tags?: string[] }) {
    return this.db.questionBank.create({ data });
  }

  async deleteQuestionBank(id: string) {
    await this.db.questionBank.delete({ where: { id } });
    return { message: 'Question bank deleted' };
  }
}
