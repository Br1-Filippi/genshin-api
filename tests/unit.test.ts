import type { Context } from 'koa';
import { errorHandler } from '../src/app';
import { isSafeSegment, NotFoundError } from '../src/modules/filesystem';
import { firstValue, matchesFilters } from '../src/routes';

describe('isSafeSegment', () => {
  test.each(['albedo', 'hu-tao', 'Pyro', 'es'])('acepta %s', (value) => {
    expect(isSafeSegment(value)).toBe(true);
  });

  test.each(['..', 'a/b', '', 'albedo.json'])('rechaza "%s"', (value) => {
    expect(isSafeSegment(value)).toBe(false);
  });
});

describe('firstValue', () => {
  test('devuelve el primer valor de un arreglo', () => {
    expect(firstValue(['a', 'b'])).toBe('a');
  });

  test('devuelve el valor simple o undefined', () => {
    expect(firstValue('x')).toBe('x');
    expect(firstValue(undefined)).toBeUndefined();
  });
});

describe('matchesFilters', () => {
  const entity = { name: 'Hu Tao', rarity: 5, vision: 'Pyro' };

  test('sin filtros siempre coincide', () => {
    expect(matchesFilters(entity, {})).toBe(true);
  });

  test('compara textos de forma parcial e insensible a mayúsculas', () => {
    expect(matchesFilters(entity, { name: 'hu' })).toBe(true);
    expect(matchesFilters(entity, { vision: 'cryo' })).toBe(false);
  });

  test('compara números como texto exacto', () => {
    expect(matchesFilters(entity, { rarity: '5' })).toBe(true);
    expect(matchesFilters(entity, { rarity: '4' })).toBe(false);
  });
});

describe('errorHandler', () => {
  const fakeContext = () => ({ status: 200, body: undefined }) as unknown as Context;

  test('traduce NotFoundError a 404', async () => {
    const ctx = fakeContext();
    await errorHandler(ctx, () => Promise.reject(new NotFoundError('nada')));
    expect(ctx.status).toBe(404);
    expect(ctx.body).toEqual({ error: 'nada' });
  });

  test('responde 500 ante errores inesperados', async () => {
    const ctx = fakeContext();
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await errorHandler(ctx, () => Promise.reject(new Error('boom')));
    expect(ctx.status).toBe(500);
    expect(ctx.body).toEqual({ error: 'Internal server error' });
    spy.mockRestore();
  });

  test('no modifica respuestas exitosas', async () => {
    const ctx = fakeContext();
    await errorHandler(ctx, () => Promise.resolve());
    expect(ctx.status).toBe(200);
  });
});
