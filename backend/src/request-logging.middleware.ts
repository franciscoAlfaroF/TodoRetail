import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import type { NextFunction, Request, Response } from 'express';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

export function requestLoggingMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const incomingRequestId = request.header('x-request-id');
  const requestId =
    incomingRequestId && REQUEST_ID_PATTERN.test(incomingRequestId)
      ? incomingRequestId
      : randomUUID();
  const startedAt = performance.now();

  request.headers['x-request-id'] = requestId;
  response.setHeader('x-request-id', requestId);
  response.on('finish', () => {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level:
          response.statusCode >= 500
            ? 'error'
            : response.statusCode >= 400
              ? 'warn'
              : 'info',
        service: 'nestjs-backend',
        requestId,
        method: request.method,
        route: request.route?.path
          ? `${request.baseUrl}${request.route.path}`
          : request.path,
        statusCode: response.statusCode,
        durationMs: Math.round(performance.now() - startedAt),
      }),
    );
  });

  next();
}
