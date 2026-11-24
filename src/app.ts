/*
 * Copyright (c) 2020 genshin.dev
 * Licensed under the Open Software License version 3.0
 * Modificado para el Taller DevOps (ver README.md).
 */
import Koa, { Context, Next } from 'koa';
import cors from '@koa/cors';
import helmet from 'koa-helmet';
import router from './routes';
import { NotFoundError } from './modules/filesystem';

export async function errorHandler(ctx: Context, next: Next): Promise<void> {
  try {
    await next();
  } catch (error) {
    if (error instanceof NotFoundError) {
      ctx.status = 404;
      ctx.body = { error: error.message };
      return;
    }
    console.error('[API] Error inesperado', error);
    ctx.status = 500;
    ctx.body = { error: 'Internal server error' };
  }
}

export function createApp(): Koa {
  const app = new Koa();

  app.use(errorHandler);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cors());
  app.use(router.routes());
  app.use(router.allowedMethods());

  return app;
}
