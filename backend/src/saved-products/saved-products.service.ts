import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service.js';

function createProductKey(name: string): string {
  return name
    .trim()
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

@Injectable()
export class SavedProductsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: number) {
    return this.prisma.savedProduct.findMany({
      where: { userId },
      select: { id: true, name: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async save(userId: number, name: string) {
    const normalizedName = name.trim();
    const productKey = createProductKey(normalizedName);
    if (!productKey) {
      throw new UnprocessableEntityException('El nombre del producto no es válido');
    }

    return this.prisma.savedProduct.upsert({
      where: { userId_productKey: { userId, productKey } },
      create: { userId, name: normalizedName, productKey },
      update: {},
      select: { id: true, name: true, createdAt: true },
    });
  }

  async remove(userId: number, savedProductId: number) {
    const result = await this.prisma.savedProduct.deleteMany({
      where: { id: savedProductId, userId },
    });
    if (result.count === 0) {
      throw new NotFoundException('El producto guardado no existe');
    }
    return { deleted: true };
  }
}
