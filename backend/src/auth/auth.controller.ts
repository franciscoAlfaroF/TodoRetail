import {
  Controller,
  Post,
  Delete,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { RolesGuard } from './guards/roles.guard.js';
import { Roles } from './decorators/roles.decorator.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { Role } from '@prisma/client';
import { UpdateUserRoleDto } from './dto/update-user-role.dto.js';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  async register(
    @Body() registerDto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.register(registerDto);
    this.setAuthCookie(response, result.accessToken);
    const { accessToken: _, ...safeResult } = result;
    return safeResult;
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(loginDto);
    this.setAuthCookie(response, result.accessToken);
    const { accessToken: _, ...safeResult } = result;
    return safeResult;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('todoretail_token', this.cookieOptions());
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@CurrentUser('id') userId: number) {
    return this.authService.getProfile(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('account/export')
  async exportAccount(@CurrentUser('id') userId: number) {
    return this.authService.exportAccount(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('account')
  async deleteAccount(
    @CurrentUser('id') userId: number,
    @Res({ passthrough: true }) response: Response,
  ) {
    const account = await this.authService.deleteAccount(userId);
    response.clearCookie('todoretail_token', this.cookieOptions());
    return account;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('admin')
  adminOnly(@CurrentUser() user: any) {
    return {
      message: 'Acceso autorizado exclusivamente para administradores',
      user,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('users/:userId/role')
  updateUserRole(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
    @CurrentUser('id') actorId: number,
  ) {
    return this.authService.updateUserRole(userId, updateUserRoleDto.role, actorId);
  }

  private setAuthCookie(response: Response, token: string) {
    response.cookie('todoretail_token', token, {
      ...this.cookieOptions(),
      httpOnly: true,
    });
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      secure:
        this.configService.get<string>('COOKIE_SECURE') === 'true' ||
        this.configService.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax' as const,
      path: '/api/auth',
    };
  }
}
