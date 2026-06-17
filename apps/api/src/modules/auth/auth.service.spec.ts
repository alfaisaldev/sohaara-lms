import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../database/database.service';
import { ConfigService } from '../config/config.service';
import * as bcryptjs from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let db: Partial<Record<keyof DatabaseService, jest.Mock>>;
  let jwtService: Partial<Record<keyof JwtService, jest.Mock>>;

  const mockUser = {
    id: 'user-1',
    email: 'test@test.com',
    passwordHash: 'hashed-password',
    firstName: 'Test',
    lastName: 'User',
    status: 'active',
  };

  beforeEach(async () => {
    db = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      } as any,
      session: {
        create: jest.fn().mockResolvedValue({ id: 'session-1' }),
        updateMany: jest.fn(),
      } as any,
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('mock-token'),
    };

    const config = {
      get: jest.fn((key: string) => {
        if (key === 'JWT_SECRET') return 'test-secret';
        if (key === 'JWT_EXPIRES_IN') return '15m';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DatabaseService, useValue: db },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('should return tokens on valid credentials', async () => {
      db.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcryptjs, 'compare').mockResolvedValue(true as never);

      const result = await service.login('test@test.com', 'password');

      expect(result).toHaveProperty('accessToken', 'mock-token');
      expect(result).toHaveProperty('refreshToken', 'mock-token');
      expect(result.user).toMatchObject({ id: 'user-1', email: 'test@test.com' });
    });

    it('should throw on invalid email', async () => {
      db.user.findUnique.mockResolvedValue(null);
      await expect(service.login('wrong@test.com', 'password')).rejects.toThrow('Invalid credentials');
    });

    it('should throw on inactive account', async () => {
      db.user.findUnique.mockResolvedValue({ ...mockUser, status: 'suspended' });
      await expect(service.login('test@test.com', 'password')).rejects.toThrow('Account is not active');
    });

    it('should throw on wrong password', async () => {
      db.user.findUnique.mockResolvedValue(mockUser);
      jest.spyOn(bcryptjs, 'compare').mockResolvedValue(false as never);
      await expect(service.login('test@test.com', 'wrong')).rejects.toThrow('Invalid credentials');
    });
  });

  describe('register', () => {
    it('should create a new user and return tokens', async () => {
      db.user.findUnique = jest.fn().mockResolvedValue(null);
      (db.user as any).create = jest.fn().mockResolvedValue(mockUser);

      const result = await service.register({
        email: 'new@test.com',
        password: 'Secure123!',
        firstName: 'New',
        lastName: 'User',
      });

      expect(result).toHaveProperty('accessToken');
    });

    it('should throw on duplicate email', async () => {
      db.user.findUnique = jest.fn().mockResolvedValue(mockUser);
      await expect(
        service.register({ email: 'test@test.com', password: 'Secure123!', firstName: 'A', lastName: 'B' }),
      ).rejects.toThrow('already in use');
    });
  });

  describe('validateUser', () => {
    it('should return user profile without password', async () => {
      db.user.findUnique = jest.fn().mockResolvedValue(mockUser);
      const result = await service.validateUser('user-1');
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).toHaveProperty('id', 'user-1');
    });

    it('should throw on non-existent user', async () => {
      db.user.findUnique = jest.fn().mockResolvedValue(null);
      await expect(service.validateUser('bad-id')).rejects.toThrow('User not found');
    });
  });

  describe('refreshToken', () => {
    it('should throw when service is not properly configured', async () => {
      await expect(service.refreshToken('some-token')).rejects.toThrow();
    });
  });
});
