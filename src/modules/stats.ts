import { getAvailableEntities, getTypes } from './filesystem';

export interface TypeCount {
  type: string;
  count: number;
}

export interface Stats {
  total: number;
  largest?: string;
  types: TypeCount[];
}

/** Cuenta cuántas entidades hay de cada tipo de datos. */
export async function countByType(): Promise<TypeCount[]> {
  const counts: TypeCount[] = [];
  for (const type of await getTypes()) {
    const entities = await getAvailableEntities(type);
    counts.push({ type, count: entities.length });
  }
  return counts;
}

/** Suma las cantidades de todos los tipos. */
export function sumCounts(counts: TypeCount[]): number {
  let total = 0;
  for (const item of counts) {
    total += item.count;
  }
  return total;
}

/** Devuelve el tipo con más entidades, o undefined si la lista está vacía. */
export function findLargest(counts: TypeCount[]): TypeCount | undefined {
  let largest: TypeCount | undefined;
  for (const item of counts) {
    if (largest === undefined || item.count > largest.count) {
      largest = item;
    }
  }
  return largest;
}

/** Resumen de los datos disponibles en la API. */
export async function getStats(): Promise<Stats> {
  const counts = await countByType();
  return {
    total: sumCounts(counts),
    largest: findLargest(counts)?.type,
    types: counts,
  };
}
