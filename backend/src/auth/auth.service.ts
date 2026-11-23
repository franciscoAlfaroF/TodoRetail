import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const email = registerDto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new ConflictException('El correo ya se encuentra registrado');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(registerDto.password, salt);

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: registerDto.name || null,
        role: Role.USER,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    const token = this.generateToken(user.id, user.email, user.role);

    return {
      message: 'Usuario registrado exitosamente',
      user,
      accessToken: token,
    };
  }

  async login(loginDto: LoginDto) {
    const email = loginDto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isMatch = await bcrypt.compare(loginDto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const token = this.generateToken(user.id, user.email, user.role);

    return {
      message: 'Inicio de sesión exitoso',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      },
      accessToken: token,
    };
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return user;
  }

  async exportAccount(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        savedProducts: {
          select: {
            name: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return {
      exportedAt: new Date().toISOString(),
      account: user,
    };
  }

  async deleteAccount(userId: number) {
    return this.prisma.$transaction(async (transaction) => {
      const user = await transaction.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true },
      });

      if (!user) {
        throw new UnauthorizedException('Usuario no encontrado');
      }

      if (user.role === Role.ADMIN) {
        const adminCount = await transaction.user.count({
          where: { role: Role.ADMIN },
        });

        if (adminCount <= 1) {
          throw new ConflictException(
            'No se puede eliminar la cuenta del último administrador',
          );
        }
      }

      return transaction.user.delete({
        where: { id: userId },
        select: { id: true },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async updateUserRole(userId: number, role: Role, actorId: number) {
    if (userId === actorId) {
      throw new BadRequestException('No puedes cambiar tu propio rol');
    }

    return this.prisma.$transaction(
      async (transaction) => {
        const target = await transaction.user.findUnique({
          where: { id: userId },
          select: { id: true, role: true },
        });

        if (!target) {
          throw new NotFoundException('Usuario no encontrado');
        }

        if (target.role === Role.ADMIN && role === Role.USER) {
          const adminCount = await transaction.user.count({
            where: { role: Role.ADMIN },
          });

          if (adminCount <= 1) {
            throw new ConflictException('No se puede quitar el rol del último administrador');
          }
        }

        return transaction.user.update({
          where: { id: userId },
          data: { role },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private generateToken(userId: number, email: string, role: string): string {
    const payload = { sub: userId, email, role };
    return this.jwtService.sign(payload);
  }
}
