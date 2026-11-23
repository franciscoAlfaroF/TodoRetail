import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../prisma.service.js';
import { SavedProductsService } from './saved-products.service.js';

describe('SavedProductsService', () => {
  const prisma = {
    savedProduct: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      deleteMany: vi.fn(),
    },
  };
  let service: SavedProductsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SavedProductsService(prisma as unknown as PrismaService);
  });

  it('lists only the requesting user saved products', async () => {
    prisma.savedProduct.findMany.mockResolvedValue([]);

    await service.list(9);

    expect(prisma.savedProduct.findMany).toHaveBeenCalledWith({
      where: { userId: 9 },
      select: { id: true, name: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('normalizes names and makes repeated saves idempotent', async () => {
    prisma.savedProduct.upsert.mockResolvedValue({ id: 1, name: 'Leche Entera 1 L' });

    await service.save(9, '  LÉCHE Entera 1 L  ');

    expect(prisma.savedProduct.upsert).toHaveBeenCalledWith({
      where: { userId_productKey: { userId: 9, productKey: 'leche entera 1 l' } },
      create: {
        userId: 9,
        name: 'LÉCHE Entera 1 L',
        productKey: 'leche entera 1 l',
      },
      update: {},
      select: { id: true, name: true, createdAt: true },
    });
  });

  it('does not delete another user saved product', async () => {
    prisma.savedProduct.deleteMany.mockResolvedValue({ count: 0 });

    await expect(service.remove(9, 3)).rejects.toThrow(NotFoundException);
    expect(prisma.savedProduct.deleteMany).toHaveBeenCalledWith({
      where: { id: 3, userId: 9 },
    });
  });
});
