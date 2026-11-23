import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma.service.js';
import { AuthModule } from './auth/auth.module.js';
import { SavedProductsController } from './saved-products/saved-products.controller.js';
import { SavedProductsService } from './saved-products/saved-products.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    HttpModule,
    AuthModule,
  ],
  controllers: [AppController, SavedProductsController],
  providers: [AppService, PrismaService, SavedProductsService],
})
export class AppModule {}
