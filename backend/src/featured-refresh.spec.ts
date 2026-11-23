import { afterEach, describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { refreshFeaturedCache } from './featured-refresh.js';

describe('refreshFeaturedCache', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('replaces only successfully scraped supermarkets and preserves failed source data', async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 0 });
    const createMany = vi.fn().mockResolvedValue({ count: 1 });
    const prisma = {
      $transaction: vi.fn(
        async (
          callback: (transaction: {
            featuredProduct: {
              deleteMany: typeof deleteMany;
              createMany: typeof createMany;
            };
          }) => Promise<unknown>,
        ) =>
          callback({
            featuredProduct: { deleteMany, createMany },
          }),
      ),
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          sources: [
            { supermarket: 'Jumbo', status: 'ok' },
            { supermarket: 'Santa Isabel', status: 'error' },
          ],
          results: [
            {
              supermarket: 'Jumbo',
              name: 'Leche',
              price: 1000,
              is_offer: false,
              url: 'https://www.jumbo.cl/leche/p',
            },
            {
              supermarket: 'Santa Isabel',
              name: 'Leche',
              price: 900,
            },
          ],
        }),
      }),
    );

    const complete = await refreshFeaturedCache(
      prisma as unknown as PrismaClient,
      'http://python-service:8000',
    );

    expect(complete).toBe(false);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(deleteMany).toHaveBeenCalledWith({ where: { supermarket: 'Jumbo' } });
    expect(deleteMany).not.toHaveBeenCalledWith({
      where: { supermarket: 'Santa Isabel' },
    });
    expect(fetch).toHaveBeenCalledWith(
      'http://python-service:8000/featured',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });
});
