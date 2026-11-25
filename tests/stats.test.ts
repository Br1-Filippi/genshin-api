import request from 'supertest';
import { createApp } from '../src/app';
import { clearCache } from '../src/modules/filesystem';
import { countByType, findLargest, sumCounts } from '../src/modules/stats';

const counts = [
  { type: 'elements', count: 7 },
  { type: 'weapons', count: 189 },
  { type: 'nations', count: 6 },
];

beforeEach(() => clearCache());

describe('sumCounts', () => {
  test('suma las cantidades de todos los tipos', () => {
    expect(sumCounts(counts)).toBe(202);
  });

  test('devuelve 0 si la lista está vacía', () => {
    expect(sumCounts([])).toBe(0);
  });
});

describe('findLargest', () => {
  test('devuelve el tipo con más entidades', () => {
    expect(findLargest(counts)).toEqual({ type: 'weapons', count: 189 });
  });

  test('devuelve undefined si la lista está vacía', () => {
    expect(findLargest([])).toBeUndefined();
  });
});

describe('countByType', () => {
  test('incluye los tipos de datos con su cantidad', async () => {
    const result = await countByType();
    expect(result).toContainEqual({ type: 'elements', count: 7 });
    expect(result.every((item) => item.count > 0)).toBe(true);
  });
});

describe('GET /stats', () => {
  test('responde el total, el tipo mayor y el detalle por tipo', async () => {
    const res = await request(createApp().callback()).get('/stats');
    expect(res.status).toBe(200);
    expect(res.body.largest).toBe('weapons');
    expect(res.body.total).toBe(sumCounts(res.body.types));
  });
});
