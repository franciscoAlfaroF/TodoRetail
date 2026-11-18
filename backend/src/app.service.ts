import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { PrismaService } from './prisma.service.js';

@Injectable()
export class AppService {
  private pythonServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService
  ) {
    this.pythonServiceUrl = this.configService.get<string>('PYTHON_SERVICE_URL') || 'http://localhost:8000';
  }

  async getHealth() {
    const [database, pythonService] = await Promise.all([
      this.checkDatabase(),
      this.checkPythonService(),
    ]);
    const checks = { database, pythonService };
    const healthy = Object.values(checks).every((status) => status === 'ok');

    return {
      status: healthy ? 'ok' : 'degraded',
      service: 'nestjs-backend',
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  async delegateExtractionToPython(query: string, requestId: string) {
    const payload = {
      query,
      supermarkets: ["Santa Isabel", "Unimarc", "Jumbo"]
    };

    const startedAt = performance.now();
    const { data } = await firstValueFrom(
      this.httpService
        .post(`${this.pythonServiceUrl}/extract`, payload, {
          headers: { 'x-request-id': requestId },
          timeout: 90000,
        })
        .pipe(
          catchError((error) => {
            console.error(
              JSON.stringify({
                service: 'nestjs-backend',
                event: 'python_service_error',
                requestId,
                errorType: error instanceof Error ? error.name : 'UnknownError',
              }),
            );
            throw new HttpException(
              'Servicio de extraccion no disponible',
              HttpStatus.SERVICE_UNAVAILABLE,
            );
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

    console.log(
      JSON.stringify({
        service: 'nestjs-backend',
        event: 'extraction_completed',
        requestId,
        resultCount: Array.isArray(data?.results) ? data.results.length : 0,
        durationMs: Math.round(performance.now() - startedAt),
      }),
    );

    return data;
  }

  private async checkDatabase(): Promise<'ok' | 'error'> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'ok';
    } catch (error) {
      console.warn(
        JSON.stringify({
          service: 'nestjs-backend',
          event: 'health_check_failed',
          dependency: 'database',
          errorType: error instanceof Error ? error.name : 'UnknownError',
        }),
      );
      return 'error';
    }
  }

  private async checkPythonService(): Promise<'ok' | 'error'> {
    try {
      await firstValueFrom(
        this.httpService.get(`${this.pythonServiceUrl}/health`, { timeout: 2000 }),
      );
      return 'ok';
    } catch (error) {
      console.warn(
        JSON.stringify({
          service: 'nestjs-backend',
          event: 'health_check_failed',
          dependency: 'python-service',
          errorType: error instanceof Error ? error.name : 'UnknownError',
        }),
      );
      return 'error';
    }
  }
}
