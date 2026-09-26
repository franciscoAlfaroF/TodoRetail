import { Controller, Get, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller('api')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth() {
    return { status: 'ok', service: 'nestjs-backend', timestamp: new Date().toISOString() };
  }

  @Post('extract')
  async extractPrices(@Body() body: { query: string }) {
    if (!body.query) {
      throw new HttpException('Query is required', HttpStatus.BAD_REQUEST);
    }
    return this.appService.delegateExtractionToPython(body.query);
  }
}
