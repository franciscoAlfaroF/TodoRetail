import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

const REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000;
const RETRY_INTERVAL_MS = 15 * 60 * 1000;
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL;
const SUPERMARKETS = new Set(['Jumbo', 'Santa Isabel', 'Unimarc']);

interface FeaturedProduct {
  supermarket: string;
  name: string;
  price: number;
  is_offer?: boolean;
  url?: string | null;
}

interface FeaturedSource {
  supermarket: string;
  status: string;
}

interface FeaturedResponse {
  results: FeaturedProduct[];
  sources: FeaturedSource[];
}

function logRefresh(
  level: 'info' | 'warning' | 'error',
  event: string,
  details: Record<string, unknown> = {},
) {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service: 'featured-refresh',
    event,
    ...details,
  });
  if (level === 'warning') {
    console.warn(entry);
  } else {
    console[level](entry);
  }
}

function productKey(product: FeaturedProduct): string {
  const identity = product.url || product.name;
  return identity
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export async function refreshFeaturedCache(
  prisma: PrismaClient,
  serviceUrl: string,
): Promise<boolean> {
  const response = await fetch(`${serviceUrl}/featured`, {
    headers: { 'x-request-id': `featured-${randomUUID()}` },
    signal: AbortSignal.timeout(90000),
  });
  if (!response.ok) {
    throw new Error(`Featured scraper returned HTTP ${response.status}`);
  }

  const payload = (await response.json()) as FeaturedResponse;
  if (!Array.isArray(payload.sources) || !Array.isArray(payload.results)) {
    throw new Error('Featured scraper returned an invalid response');
  }

  const sources = new Map<string, string>();
  for (const source of payload.sources) {
    if (
      !source ||
      typeof source.supermarket !== 'string' ||
      typeof source.status !== 'string'
    ) {
      throw new Error('Featured scraper returned an invalid source status');
    }
    if (SUPERMARKETS.has(source.supermarket)) {
      if (sources.has(source.supermarket)) {
        throw new Error('Featured scraper returned a duplicate source status');
      }
      sources.set(source.supermarket, source.status);
    }
  }

  const fetchedAt = new Date();
  const sourceResults = await Promise.all(
    [...SUPERMARKETS].map(async (supermarket) => {
      if (sources.get(supermarket) !== 'ok') {
        return false;
      }

      const products = payload.results.filter(
        (product) =>
          product.supermarket === supermarket &&
          typeof product.name === 'string' &&
          product.name.trim().length > 0 &&
          Number.isFinite(product.price) &&
          product.price > 0,
      );

      if (products.length === 0) {
        logRefresh('warning', 'source_returned_no_valid_products', {
          supermarket,
        });
        return false;
      }

      await prisma.$transaction(async (transaction) => {
        await transaction.featuredProduct.deleteMany({
          where: { supermarket },
        });
        await transaction.featuredProduct.createMany({
          data: products.map((product) => ({
            supermarket,
            name: product.name.trim(),
            productKey: productKey(product),
            price: product.price,
            isOffer: product.is_offer ?? false,
            url: product.url ?? null,
            fetchedAt,
          })),
          skipDuplicates: true,
        });
      });

      logRefresh('info', 'source_refreshed', {
        supermarket,
        resultCount: products.length,
      });
      return true;
    }),
  );

  return (
    sourceResults.length === SUPERMARKETS.size &&
    sourceResults.every(Boolean)
  );
}

async function waitForNextRefresh(delay: number): Promise<void> {
  await new Promise<void>((resolve) => {
    let timer: ReturnType<typeof setTimeout>;
    const finish = () => {
      clearTimeout(timer);
      process.off('SIGTERM', finish);
      process.off('SIGINT', finish);
      resolve();
    };
    timer = setTimeout(finish, delay);
    process.once('SIGTERM', finish);
    process.once('SIGINT', finish);
  });
}

async function main() {
  if (!PYTHON_SERVICE_URL) {
    throw new Error('PYTHON_SERVICE_URL must be configured for featured refresh');
  }

  const prisma = new PrismaClient();
  let stopping = false;
  process.once('SIGTERM', () => {
    stopping = true;
  });
  process.once('SIGINT', () => {
    stopping = true;
  });

  try {
    await prisma.$connect();
    while (!stopping) {
      let delay = RETRY_INTERVAL_MS;
      try {
        const complete = await refreshFeaturedCache(prisma, PYTHON_SERVICE_URL);
        if (complete) {
          delay = REFRESH_INTERVAL_MS;
          logRefresh('info', 'refresh_completed');
        } else {
          logRefresh('warning', 'refresh_partial');
        }
      } catch (error) {
        logRefresh('error', 'refresh_failed', {
          errorType: error instanceof Error ? error.name : 'UnknownError',
        });
      }

      if (stopping) {
        break;
      }
      await waitForNextRefresh(delay);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  logRefresh('error', 'worker_stopped', {
    errorType: error instanceof Error ? error.name : 'UnknownError',
  });
  process.exitCode = 1;
});
