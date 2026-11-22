import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';
import { requestLoggingMiddleware } from './request-logging.middleware.js';
import { csrfOriginMiddleware } from './csrf-origin.middleware.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(requestLoggingMiddleware);
  const allowedOrigins =
    process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:8100'];
  app.use(csrfOriginMiddleware);
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
