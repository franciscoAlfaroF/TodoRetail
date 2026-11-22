import type { NextFunction, Request, Response } from 'express';

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function csrfOriginMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const allowedOrigins =
    process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:8100'];
  const hasSessionCookie = request.headers.cookie
    ?.split(';')
    .some((cookie) => cookie.trim().startsWith('todoretail_token='));

  if (
    STATE_CHANGING_METHODS.has(request.method) &&
    hasSessionCookie &&
    !allowedOrigins.includes(request.headers.origin ?? '')
  ) {
    response.status(403).json({ statusCode: 403, message: 'Origen de solicitud no permitido' });
    return;
  }

  next();
}
