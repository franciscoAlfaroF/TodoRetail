import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { AppModule } from './../src/app.module.js';
import { requestLoggingMiddleware } from '../src/request-logging.middleware.js';
import { csrfOriginMiddleware } from '../src/csrf-origin.middleware.js';

const trustedOrigin = process.env.CORS_ORIGIN?.split(',')[0] ?? 'http://localhost:8100';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(HttpService)
      .useValue({ get: vi.fn().mockReturnValue(of({ status: 200 })) })
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(requestLoggingMiddleware);
    app.use(csrfOriginMiddleware);
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

  it('uses an HttpOnly cookie and does not expose a JWT in the response', async () => {
    const agent = request.agent(app.getHttpServer());
    const email = `auth-e2e-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
    const registration = await agent
      .post('/api/auth/register')
      .send({ email, password: 'password123', role: 'ADMIN' })
      .expect(201);

    expect(registration.body.user.role).toBe('USER');
    expect(registration.body.accessToken).toBeUndefined();
    expect(registration.headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('HttpOnly')]),
    );

    await agent
      .get('/api/auth/profile')
      .expect(200)
      .expect(({ body }) => expect(body.email).toBe(email));

    await agent
      .patch(`/api/auth/users/${registration.body.user.id}/role`)
      .set('Origin', trustedOrigin)
      .send({ role: 'ADMIN' })
      .expect(403);

    const exported = await agent.get('/api/auth/account/export').expect(200);
    expect(exported.body.account.email).toBe(email);
    expect(exported.body.account.password).toBeUndefined();
  });

  it('deletes the authenticated account and expires its session cookie', async () => {
    const agent = request.agent(app.getHttpServer());
    const email = `delete-e2e-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
    await agent
      .post('/api/auth/register')
      .send({ email, password: 'password123' })
      .expect(201);

    await agent
      .delete('/api/auth/account')
      .set('Origin', 'http://untrusted.example')
      .expect(403);

    await agent
      .delete('/api/auth/account')
      .set('Origin', trustedOrigin)
      .expect(200)
      .expect(({ headers }) =>
        expect(headers['set-cookie']).toEqual(
          expect.arrayContaining([expect.stringContaining('todoretail_token=;')]),
        ),
      );

    await agent.get('/api/auth/profile').expect(401);
  });

  afterEach(async () => {
    await app.close();
  });
});
