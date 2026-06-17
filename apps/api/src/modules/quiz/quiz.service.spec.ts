import { Test, TestingModule } from '@nestjs/testing';
import { QuizService } from './quiz.service';
import { DatabaseService } from '../database/database.service';

describe('QuizService', () => {
  let service: QuizService;
  let db: any;

  const mockQuiz = {
    id: 'quiz-1',
    courseId: 'course-1',
    title: 'Test Quiz',
    description: 'A test quiz',
    passingScore: 60,
    maxAttempts: 3,
    shuffleQuestions: false,
    status: 'published',
  };

  const mockQuestions = [
    {
      id: 'q-1',
      quizId: 'quiz-1',
      type: 'multiple_choice',
      title: 'What is 2+2?',
      points: 1,
      sortOrder: 0,
      options: [
        { id: 'opt-1', text: '3', isCorrect: false },
        { id: 'opt-2', text: '4', isCorrect: true },
        { id: 'opt-3', text: '5', isCorrect: false },
      ],
      matchingPairs: [],
    },
    {
      id: 'q-2',
      quizId: 'quiz-1',
      type: 'true_false',
      title: 'JavaScript is a compiled language',
      points: 1,
      sortOrder: 1,
      options: [],
      matchingPairs: [],
      correctAnswer: 'false',
      sortOrder: 1,
  ];

  beforeEach(async () => {
    db = {
      quiz: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      quizQuestion: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      quizAttempt: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      quizAnswer: {
        create: jest.fn(),
        findFirst: jest.fn(),
      },
      $transaction: jest.fn((cb: any) => cb(db)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizService,
        { provide: DatabaseService, useValue: db },
      ],
    }).compile();

    service = module.get<QuizService>(QuizService);
  });

  describe('findByCourse', () => {
    it('should return quizzes for a course', async () => {
      db.quiz.findMany.mockResolvedValue([mockQuiz]);
      const result = await service.findByCourse('course-1');
      expect(result).toEqual([mockQuiz]);
      expect(db.quiz.findMany).toHaveBeenCalledWith({
        where: { courseId: 'course-1', status: { not: 'archived' } },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findById', () => {
    it('should return quiz with questions', async () => {
      const quizWithQuestions = { ...mockQuiz, questions: mockQuestions };
      db.quiz.findUnique.mockResolvedValue(quizWithQuestions);
      const result = await service.findById('quiz-1');
      expect(result).toEqual(quizWithQuestions);
    });

    it('should throw on non-existent quiz', async () => {
      db.quiz.findUnique.mockResolvedValue(null);
      await expect(service.findById('bad-id')).rejects.toThrow('Quiz not found');
    });
  });

  describe('create', () => {
    it('should create a quiz', async () => {
      db.quiz.create.mockResolvedValue(mockQuiz);
      const result = await service.create({ courseId: 'course-1', title: 'Test Quiz' });
      expect(result).toEqual(mockQuiz);
    });
  });

  describe('gradeQuestion', () => {
    it('should grade multiple choice correctly', async () => {
      const question = mockQuestions[0];
      const correctOption = question.options.find((o: any) => o.isCorrect);
      const result = await service['gradeQuestion'](question, { answer: correctOption?.id });
      expect(result.isCorrect).toBe(true);
      expect(result.points).toBe(1);
    });

    it('should grade multiple choice incorrectly', async () => {
      const question = mockQuestions[0];
      const result = await service['gradeQuestion'](question, { answer: 'wrong-id' });
      expect(result.isCorrect).toBe(false);
      expect(result.points).toBe(0);
    });

    it('should grade true/false correctly', async () => {
      const question = mockQuestions[1];
      const result = await service['gradeQuestion'](question, { answer: 'false' });
      expect(result.isCorrect).toBe(true);
    });

    it('should grade true/false incorrectly', async () => {
      const question = mockQuestions[1];
      const result = await service['gradeQuestion'](question, { answer: 'true' });
      expect(result.isCorrect).toBe(false);
    });

    it('should return isCorrect=false for essay (needs manual grading)', async () => {
      const essayQuestion = { id: 'q-3', type: 'essay', points: 10 };
      const result = await service['gradeQuestion'](essayQuestion, { answer: 'essay content' });
      expect(result.isCorrect).toBe(false);
      expect(result.points).toBe(0);
    });
  });

  describe('startAttempt', () => {
    it('should create an attempt', async () => {
      db.quiz.findUnique.mockResolvedValue({ ...mockQuiz, questions: mockQuestions });
      db.quizAttempt.create.mockResolvedValue({ id: 'attempt-1', quizId: 'quiz-1', userId: 'user-1', questions: mockQuestions });

      const result = await service.startAttempt('quiz-1', 'user-1', 'enr-1');
      expect(result).toHaveProperty('id', 'attempt-1');
    });

    it('should enforce max attempts', async () => {
      db.quiz.findUnique.mockResolvedValue(mockQuiz);
      db.quizAttempt.count.mockResolvedValue(3);
      await expect(service.startAttempt('quiz-1', 'user-1', 'enr-1')).rejects.toThrow('Maximum attempts');
    });
  });

  describe('submitAttempt', () => {
    it('should grade and submit an attempt', async () => {
      const attempt = { id: 'attempt-1', quizId: 'quiz-1', submittedAt: null, answers: [] };
      db.quizAttempt.findFirst.mockResolvedValue(attempt);
      db.quiz.findUnique.mockResolvedValue({ ...mockQuiz, questions: mockQuestions });
      db.quizAnswer.findFirst.mockResolvedValue(null);
      db.quizAttempt.update.mockResolvedValue({ ...attempt, submittedAt: new Date(), score: 2, maxScore: 2, passed: true });

      const result = await service.submitAttempt('attempt-1');
      expect(result).toBeDefined();
    });
  });
});
