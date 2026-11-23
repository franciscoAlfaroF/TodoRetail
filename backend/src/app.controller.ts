import {
  Controller,
  Get,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Headers,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AppService } from './app.service.js';

@Controller('api')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  async getHealth(@Res({ passthrough: true }) response: Response) {
    const health = await this.appService.getHealth();
    response.status(health.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);
    return health;
  }

  @Post('extract')
  async extractPrices(
    @Body() body: { query: string },
    @Headers('x-request-id') requestId: string,
  ) {
    if (!body.query) {
      throw new HttpException('Query is required', HttpStatus.BAD_REQUEST);
    }
    return this.appService.delegateExtractionToPython(body.query, requestId);
  }

  @Get('featured')
  getFeaturedProducts() {
    return this.appService.getFeaturedProducts();
  }
}
