import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../prisma.service.js';
import { JwtService } from '@nestjs/jwt';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { RegisterDto } from './dto/register.dto.js';
import bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;

  const mockUser = {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  };

  const mockPrisma = {
    user: mockUser,
    $transaction: vi.fn(
      async (callback: (transaction: { user: typeof mockUser }) => unknown) =>
        callback({ user: mockUser }),
    ),
  };

  const mockJwt = {
    sign: vi.fn().mockReturnValue('mocked_jwt_token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should throw ConflictException if user already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 1, email: 'test@example.com' });

      await expect(
        service.register({ email: 'test@example.com', password: 'password123' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create user and return accessToken', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        name: 'Test',
        role: 'USER',
        createdAt: new Date(),
      });

      const res = await service.register({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test',
      });

      expect(res.accessToken).toBe('mocked_jwt_token');
      expect(res.user.email).toBe('test@example.com');
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: Role.USER }),
        }),
      );
    });

    it('should ignore an admin role supplied in the registration payload', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        role: Role.USER,
        createdAt: new Date(),
      });

      const payload = Object.assign(new RegisterDto(), {
        email: 'test@example.com',
        password: 'password123',
        role: Role.ADMIN,
      });

      await service.register(payload);

      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: Role.USER }),
        }),
      );
    });
  });

  describe('updateUserRole', () => {
    it('should grant an admin role to another user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 2, role: Role.USER });
      mockPrisma.user.update.mockResolvedValue({
        id: 2,
        email: 'user@example.com',
        role: Role.ADMIN,
      });

      await expect(service.updateUserRole(2, Role.ADMIN, 1)).resolves.toMatchObject({
        id: 2,
        role: Role.ADMIN,
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { role: Role.ADMIN } }),
      );
    });

    it('should reject changes to the acting admin role', async () => {
      await expect(service.updateUserRole(1, Role.USER, 1)).rejects.toThrow(BadRequestException);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should reject role changes for a missing user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.updateUserRole(2, Role.ADMIN, 1)).rejects.toThrow(NotFoundException);
    });

    it('should keep at least one administrator', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 2, role: Role.ADMIN });
      mockPrisma.user.count.mockResolvedValue(1);

      await expect(service.updateUserRole(2, Role.USER, 1)).rejects.toThrow(ConflictException);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('account privacy', () => {
    it('exports account data without selecting the password hash', async () => {
      const account = {
        id: 1,
        email: 'test@example.com',
        name: 'Test',
        role: Role.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
        savedProducts: [],
      };
      mockPrisma.user.findUnique.mockResolvedValue(account);

      await expect(service.exportAccount(1)).resolves.toMatchObject({ account });
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          savedProducts: {
            select: { name: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    });

    it('deletes an account and prevents deleting the last administrator', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 2, role: Role.USER });
      mockPrisma.user.delete.mockResolvedValue({ id: 2 });
      await expect(service.deleteAccount(2)).resolves.toEqual({ id: 2 });

      mockPrisma.user.findUnique.mockResolvedValue({ id: 1, role: Role.ADMIN });
      mockPrisma.user.count.mockResolvedValue(1);
      await expect(service.deleteAccount(1)).rejects.toThrow(ConflictException);
      expect(mockPrisma.user.delete).toHaveBeenCalledTimes(1);
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'unknown@example.com', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      const hashedPassword = await bcrypt.hash('correct_password', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        password: hashedPassword,
        role: 'USER',
      });

      await expect(
        service.login({ email: 'test@example.com', password: 'wrong_password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return token if credentials are valid', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        password: hashedPassword,
        role: 'USER',
        createdAt: new Date(),
      });

      const res = await service.login({ email: 'test@example.com', password: 'password123' });
      expect(res.accessToken).toBe('mocked_jwt_token');
      expect(res.user.email).toBe('test@example.com');
    });
  });
});
