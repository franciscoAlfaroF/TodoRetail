import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CreateSavedProductDto } from './dto/create-saved-product.dto.js';
import { SavedProductsService } from './saved-products.service.js';

@Controller('api/saved-products')
@UseGuards(JwtAuthGuard)
export class SavedProductsController {
  constructor(private readonly savedProductsService: SavedProductsService) {}

  @Get()
  list(@CurrentUser('id') userId: number) {
    return this.savedProductsService.list(userId);
  }

  @Post()
  save(
    @CurrentUser('id') userId: number,
    @Body() createSavedProductDto: CreateSavedProductDto,
  ) {
    return this.savedProductsService.save(userId, createSavedProductDto.name);
  }

  @Delete(':id')
  remove(
    @CurrentUser('id') userId: number,
    @Param('id', ParseIntPipe) savedProductId: number,
  ) {
    return this.savedProductsService.remove(userId, savedProductId);
  }
}
