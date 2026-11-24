import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { createApp } from '../src/app';
import { clearCache } from '../src/modules/filesystem';

const app = createApp().callback();
const charactersDir = path.join(__dirname, '..', 'assets', 'data', 'characters');
const characterIds = fs.readdirSync(charactersDir);
const withoutSpanish = characterIds.find(
  (id) => !fs.existsSync(path.join(charactersDir, id, 'es.json')),
);

beforeEach(() => clearCache());

describe('rutas generales', () => {
  test('GET / lista los tipos de datos', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.types).toEqual(
      expect.arrayContaining(['characters', 'elements', 'nations', 'weapons']),
    );
  });

  test('GET /health responde ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  test('responde 404 en un tipo inexistente', async () => {
    const res = await request(app).get('/pokemon');
    expect(res.status).toBe(404);
    expect(res.body.error).toContain('pokemon');
  });

  test('rechaza segmentos de ruta inválidos', async () => {
    const res = await request(app).get('/characters/..%2F..%2Fetc');
    expect(res.status).toBe(404);
    expect(res.body.error).toContain('Invalid path segment');
  });
});

describe('personajes', () => {
  test('GET /characters lista los ids', async () => {
    const res = await request(app).get('/characters');
    expect(res.status).toBe(200);
    expect(res.body).toContain('albedo');
    expect(res.body).toHaveLength(characterIds.length);
  });

  test('GET /characters/:id devuelve el personaje en inglés por defecto', async () => {
    const res = await request(app).get('/characters/albedo');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 'albedo', name: 'Albedo', lang: 'en' });
  });

  test('GET /characters/:id?lang=es traduce y completa campos con inglés', async () => {
    const res = await request(app).get('/characters/albedo?lang=es');
    expect(res.status).toBe(200);
    expect(res.body.lang).toBe('es');
    expect(res.body.weapon).toBe('Espada Ligera');
    expect(res.body.vision_key).toBe('GEO');
  });

  test('sin traducción devuelve la versión en inglés', async () => {
    expect(withoutSpanish).toBeDefined();
    const res = await request(app).get(`/characters/${withoutSpanish}?lang=es`);
    expect(res.status).toBe(200);
    expect(res.body.lang).toBe('en');
  });

  test('GET /characters/:id inexistente responde 404', async () => {
    const res = await request(app).get('/characters/pikachu');
    expect(res.status).toBe(404);
  });

  test('GET /characters/all devuelve todos los personajes', async () => {
    const res = await request(app).get('/characters/all?lang=es');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(characterIds.length);
  });

  test('GET /characters/all filtra por texto sin importar mayúsculas', async () => {
    const res = await request(app).get('/characters/all?vision=pyro');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    for (const character of res.body) expect(character.vision).toBe('Pyro');
  });

  test('GET /characters/all filtra por valores numéricos', async () => {
    const res = await request(app).get('/characters/all?rarity=5');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    for (const character of res.body) expect(character.rarity).toBe(5);
  });

  test('GET /characters/all con parámetro repetido usa el primero', async () => {
    const res = await request(app).get('/characters/all?nation=Liyue&nation=Inazuma');
    expect(res.status).toBe(200);
    for (const character of res.body) expect(character.nation).toBe('Liyue');
  });
});

describe('imágenes', () => {
  test('GET /characters/:id/list lista las imágenes', async () => {
    const res = await request(app).get('/characters/albedo/list');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(['card', 'icon-big']);
  });

  test('GET /characters/:id/list sin imágenes responde 404', async () => {
    const res = await request(app).get('/weapons/akuoumaru/list');
    expect(res.status).toBe(404);
  });

  test('GET /characters/:id/:image devuelve webp por defecto', async () => {
    const res = await request(app).get('/characters/albedo/icon-big');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/webp');
    expect(res.headers['cache-control']).toContain('max-age');
    expect(res.body.length).toBeGreaterThan(0);
  });

  test('GET /characters/:id/:image.png convierte a png', async () => {
    const res = await request(app).get('/elements/pyro/icon.png');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('image/png');
  });

  test('la segunda petición usa la caché', async () => {
    const first = await request(app).get('/elements/hydro/icon.jpg');
    const second = await request(app).get('/elements/hydro/icon.jpg');
    expect(first.headers['content-type']).toBe('image/jpeg');
    expect(second.body.equals(first.body)).toBe(true);
  });

  test('imagen inexistente responde 404', async () => {
    const res = await request(app).get('/characters/albedo/gacha-splash');
    expect(res.status).toBe(404);
  });
});
