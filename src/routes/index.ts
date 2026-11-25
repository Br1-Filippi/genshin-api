/*
 * Copyright (c) 2020 genshin.dev
 * Licensed under the Open Software License version 3.0
 * Modificado para el Taller DevOps (ver README.md).
 */
import Router from '@koa/router';
import {
  Entity,
  getAvailableEntities,
  getAvailableImages,
  getEntity,
  getImage,
  getTypes,
} from '../modules/filesystem';
import { getStats } from '../modules/stats';

type QueryValue = string | string[] | undefined;

const router = new Router();

export function firstValue(value: QueryValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function matchesFilters(
  entity: Record<string, unknown>,
  filters: Record<string, string>,
): boolean {
  return Object.entries(filters).every(([key, expected]) => {
    const value = entity[key];
    if (typeof value === 'string') {
      return value.toLowerCase().includes(expected.toLowerCase());
    }
    return String(value) === expected;
  });
}

router.get('/', async (ctx) => {
  ctx.body = { types: await getTypes() };
});

router.get('/health', (ctx) => {
  ctx.body = { status: 'ok' };
});

router.get('/stats', async (ctx) => {
  ctx.body = await getStats();
});

router.get('/:type/all', async (ctx) => {
  const { lang, ...rest } = ctx.query;
  const filters: Record<string, string> = {};
  for (const [key, value] of Object.entries(rest)) {
    filters[key] = firstValue(value) ?? '';
  }

  const ids = await getAvailableEntities(ctx.params.type);
  const entities = await Promise.all(
    ids.map((id) =>
      getEntity(ctx.params.type, id, firstValue(lang)).catch(() => undefined),
    ),
  );

  ctx.body = entities.filter(
    (entity): entity is Entity =>
      entity !== undefined && matchesFilters(entity, filters),
  );
});

router.get('/:type', async (ctx) => {
  ctx.body = await getAvailableEntities(ctx.params.type);
});

router.get('/:type/:id', async (ctx) => {
  const { type, id } = ctx.params;
  ctx.body = await getEntity(type, id, firstValue(ctx.query.lang));
});

router.get('/:type/:id/list', async (ctx) => {
  ctx.body = await getAvailableImages(ctx.params.type, ctx.params.id);
});

router.get('/:type/:id/:image', async (ctx) => {
  const { type, id, image } = ctx.params;
  const result = await getImage(type, id, image);
  ctx.set('Cache-Control', 'public, max-age=86400');
  ctx.type = result.mimeType;
  ctx.body = result.data;
});

export default router;
