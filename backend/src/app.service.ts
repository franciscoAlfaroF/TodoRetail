import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PrismaService } from './prisma.service.js';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private pythonServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService
  ) {
    this.pythonServiceUrl = this.configService.get<string>('PYTHON_SERVICE_URL') || 'http://localhost:8000';
  }

  async delegateExtractionToPython(query: string) {
    const payload = {
      query,
      supermarkets: ["Santa Isabel", "Unimarc", "Jumbo"]
    };

    const { data } = await firstValueFrom(
      this.httpService.post(`${this.pythonServiceUrl}/extract`, payload).pipe(
        catchError((error) => {
          this.logger.error(`Python service failed: ${error.message}`);
          throw new HttpException('Servicio de extraccion no disponible', HttpStatus.SERVICE_UNAVAILABLE);
        }),
      ),
    );

    // Save real products to Database
    if (data && data.results) {
      for (const prod of data.results) {
        // Solamente guardar si no es un mock
        if (!prod.name.includes('(Mock)')) {
          await this.prisma.product.create({
            data: {
              supermarket: prod.supermarket,
              name: prod.name,
              price: prod.price,
              isOffer: prod.is_offer || false,
              url: prod.url || '',
            }
          });
        }
      }
    }

    return data;
  }
}
