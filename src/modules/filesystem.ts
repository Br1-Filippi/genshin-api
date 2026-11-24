/*
 * Copyright (c) 2020 genshin.dev
 * Licensed under the Open Software License version 3.0
 * Modificado para el Taller DevOps (ver README.md).
 */
import { promises as fs } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { dataDirectory, DEFAULT_LANG, imagesDirectory } from '../config';

export class NotFoundError extends Error {
  readonly status = 404;
}

export type Entity = Record<string, unknown> & { id: string; lang: string };

export interface ImageResult {
  data: Buffer;
  mimeType: string;
}

const FORMATS = {
  png: { mime: 'image/png', sharp: 'png' },
  jpg: { mime: 'image/jpeg', sharp: 'jpeg' },
  jpeg: { mime: 'image/jpeg', sharp: 'jpeg' },
  webp: { mime: 'image/webp', sharp: 'webp' },
} as const;

type ImageFormat = keyof typeof FORMATS;

const SAFE_SEGMENT = /^[a-z0-9-]+$/i;
const cache = new Map<string, unknown>();

export function isSafeSegment(value: string): boolean {
  return SAFE_SEGMENT.test(value);
}

function assertSafe(...values: string[]): void {
  for (const value of values) {
    if (!isSafeSegment(value)) {
      throw new NotFoundError(`Invalid path segment: ${value}`);
    }
  }
}

async function cached<T>(key: string, loader: () => Promise<T>): Promise<T> {
  if (cache.has(key)) return cache.get(key) as T;
  const value = await loader();
  cache.set(key, value);
  return value;
}

export function clearCache(): void {
  cache.clear();
}

async function listDirectory(dir: string, notFound: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir);
    return entries.sort((a, b) => a.localeCompare(b));
  } catch {
    throw new NotFoundError(notFound);
  }
}

async function readJson(
  file: string,
): Promise<Record<string, unknown> | undefined> {
  try {
    const content = await fs.readFile(file, 'utf-8');
    return JSON.parse(content) as Record<string, unknown>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

export function getTypes(): Promise<string[]> {
  return cached('types', () => listDirectory(dataDirectory(), 'No data'));
}

export function getAvailableEntities(type: string): Promise<string[]> {
  assertSafe(type);
  return cached(`entities:${type}`, () =>
    listDirectory(dataDirectory(type), `Type ${type} not found`),
  );
}

/**
 * Devuelve una entidad en el idioma pedido. Los campos que falten en la
 * traducción se completan con la versión en inglés; si no existe la
 * traducción se devuelve la versión en inglés (campo `lang` = "en").
 */
export function getEntity(
  type: string,
  id: string,
  lang: string = DEFAULT_LANG,
): Promise<Entity> {
  assertSafe(type, id, lang);
  const key = `entity:${type}:${id}:${lang}`.toLowerCase();

  return cached(key, async () => {
    const dir = dataDirectory(type, id.toLowerCase());
    const base = await readJson(path.join(dir, `${DEFAULT_LANG}.json`));
    const translated =
      lang === DEFAULT_LANG
        ? undefined
        : await readJson(path.join(dir, `${lang}.json`));

    if (!base && !translated) {
      throw new NotFoundError(`Entity ${type}/${id} not found`);
    }

    return {
      ...base,
      ...translated,
      id,
      lang: translated ? lang : DEFAULT_LANG,
    };
  });
}

export function getAvailableImages(type: string, id: string): Promise<string[]> {
  assertSafe(type, id);
  return cached(`images:${type}:${id}`, () =>
    listDirectory(imagesDirectory(type, id), `No images for ${type}/${id}`),
  );
}

export function getImage(
  type: string,
  id: string,
  image: string,
): Promise<ImageResult> {
  const { name, ext } = path.parse(image);
  assertSafe(type, id, name);

  const requested = ext.slice(1).toLowerCase();
  const format: ImageFormat =
    requested in FORMATS ? (requested as ImageFormat) : 'webp';

  return cached(`image:${type}:${id}:${name}:${format}`, async () => {
    const file = imagesDirectory(type, id, name);
    try {
      await fs.access(file);
    } catch {
      throw new NotFoundError(`Image ${type}/${id}/${image} not found`);
    }

    const { mime, sharp: sharpFormat } = FORMATS[format];
    const data = await sharp(file).toFormat(sharpFormat).toBuffer();
    return { data, mimeType: mime };
  });
}
