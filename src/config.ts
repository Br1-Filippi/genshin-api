/*
 * Copyright (c) 2020 genshin.dev
 * Licensed under the Open Software License version 3.0
 * Modificado para el Taller DevOps (ver README.md).
 */
import path from 'path';

export const DEFAULT_LANG = 'en';

export const ASSETS_DIR =
  process.env.ASSETS_DIR ?? path.join(__dirname, '..', 'assets');

export const dataDirectory = (...parts: string[]): string =>
  path.join(ASSETS_DIR, 'data', ...parts);

export const imagesDirectory = (...parts: string[]): string =>
  path.join(ASSETS_DIR, 'images', ...parts);
