import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module.js';
import { requestLoggingMiddleware } from '../src/request-logging.middleware.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(requestLoggingMiddleware);
    await app.init();
  });

  it('/api/health (GET) reports dependency health and a request id', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .set('x-request-id', 'health-e2e-001')
      .expect(200)
      .expect('x-request-id', 'health-e2e-001')
      .expect((response) => {
        expect(response.body).toMatchObject({
          status: 'ok',
          service: 'nestjs-backend',
          checks: { database: 'ok', pythonService: 'ok' },
        });
      });
  });

  it('creates a safe request id when the supplied id is invalid', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .set('x-request-id', 'invalid request id')
      .expect(200)
      .expect((response) => {
        expect(response.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
      });
  });

  it('rejects role administration without an authenticated admin', () => {
    return request(app.getHttpServer())
      .patch('/api/auth/users/1/role')
      .send({ role: 'ADMIN' })
      .expect(401);
  });

  it('does not grant admin through public registration or allow a user to assign roles', async () => {
    const email = `auth-e2e-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
    const registration = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, password: 'password123', role: 'ADMIN' })
      .expect(201);

    expect(registration.body.user.role).toBe('USER');

    await request(app.getHttpServer())
      .patch(`/api/auth/users/${registration.body.user.id}/role`)
      .set('Authorization', `Bearer ${registration.body.accessToken}`)
      .send({ role: 'ADMIN' })
      .expect(403);
  });

  afterEach(async () => {
    await app.close();
  });
});
