import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private pythonServiceUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService
  ) {
    this.pythonServiceUrl = this.configService.get<string>('PYTHON_SERVICE_URL') || 'http://localhost:8000';
  }

  async delegateExtractionToPython(query: string) {
    const payload = {
      query,
      supermarkets: ["Jumbo", "Lider"]
    };

    const { data } = await firstValueFrom(
      this.httpService.post(`${this.pythonServiceUrl}/extract`, payload).pipe(
        catchError((error) => {
          this.logger.error(`Python service failed: ${error.message}`);
          throw new HttpException('Servicio de extracción no disponible', HttpStatus.SERVICE_UNAVAILABLE);
        }),
      ),
    );

    return data;
  }
}
