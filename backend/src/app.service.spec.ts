import { describe, expect, it, vi } from 'vitest';
import { AppService } from './app.service.js';
import { PrismaService } from './prisma.service.js';

describe('AppService', () => {
  it('returns featured products from the shared cache with a conservative update time', async () => {
    const newest = new Date('2026-11-22T12:00:00.000Z');
    const oldest = new Date('2026-11-22T11:00:00.000Z');
    const prisma = {
      featuredProduct: {
        findMany: vi.fn().mockResolvedValue([
          {
            supermarket: 'Jumbo',
            name: 'Leche Entera 1 L',
            price: 1000,
            isOffer: true,
            url: 'https://www.jumbo.cl/leche/p',
            fetchedAt: newest,
          },
          {
            supermarket: 'Santa Isabel',
            name: 'Leche Entera 1 L',
            price: 1100,
            isOffer: false,
            url: 'https://www.santaisabel.cl/leche/p',
            fetchedAt: oldest,
          },
        ]),
      },
    };
    const service = new AppService(
      {} as never,
      { get: () => 'http://python-service:8000' } as never,
      prisma as unknown as PrismaService,
    );

    await expect(service.getFeaturedProducts()).resolves.toEqual({
      status: 'success',
      updatedAt: oldest.toISOString(),
      results: [
        {
          supermarket: 'Jumbo',
          name: 'Leche Entera 1 L',
          price: 1000,
          is_offer: true,
          url: 'https://www.jumbo.cl/leche/p',
        },
        {
          supermarket: 'Santa Isabel',
          name: 'Leche Entera 1 L',
          price: 1100,
          is_offer: false,
          url: 'https://www.santaisabel.cl/leche/p',
        },
      ],
    });
  });
});
