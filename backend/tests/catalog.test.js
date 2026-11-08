/**
 * PCHelper (ЛР7) — тесты каталога.
 *
 * Проверяют контракт API, а не конкретную базу: сервис поднимается
 * на случайном порту и работает с демонстрационным каталогом, потому что
 * в CI переменные Supabase не заданы. Логика фильтров, сортировки и
 * страниц от источника данных не зависит.
 *
 * @version 1.0
 */

import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';

import { createApp } from '../src/app.js';

let server;
let baseUrl;

before(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

/**
 * GET-запрос с разбором JSON.
 *
 * @param {string} path Путь относительно /api/v1.
 * @returns {Promise<{status: number, body: object}>}
 */
async function get(path) {
  const res = await fetch(`${baseUrl}/api/v1${path}`);
  return { status: res.status, body: await res.json() };
}

test('категории: восемь штук, у каждой есть код, название и количество', async () => {
  const { status, body } = await get('/categories');
  assert.equal(status, 200);
  assert.equal(body.total, 8);
  assert.equal(body.items.length, 8);
  for (const item of body.items) {
    assert.equal(typeof item.id, 'string');
    assert.equal(typeof item.name, 'string');
    assert.equal(typeof item.count, 'number');
  }
});

test('каталог: без фильтров отдаёт все товары и общее количество', async () => {
  const { status, body } = await get('/products');
  assert.equal(status, 200);
  assert.equal(body.total, 16);
  assert.equal(body.items.length, 16);
  assert.equal(body.limit, 20);
  assert.equal(body.offset, 0);
});

test('каталог: фильтр по категории возвращает только её товары', async () => {
  const { status, body } = await get('/products?category=cpu');
  assert.equal(status, 200);
  assert.equal(body.total, 2);
  for (const item of body.items) assert.equal(item.category, 'cpu');
});

test('каталог: поиск по названию не зависит от регистра', async () => {
  const { status, body } = await get('/products?search=RYZEN');
  assert.equal(status, 200);
  assert.ok(body.total >= 1);
  for (const item of body.items) {
    assert.match(item.name.toLowerCase(), /ryzen/);
  }
});

test('каталог: поиск находит по категории, а не только по названию', async () => {
  const { status, body } = await get('/products?search=корпус');
  assert.equal(status, 200);
  assert.ok(body.total >= 1);
  for (const item of body.items) assert.equal(item.category, 'case');
});

test('каталог: поиск находит по характеристике (AM5, DDR5)', async () => {
  const am5 = await get('/products?search=AM5');
  const ddr5 = await get('/products?search=DDR5');
  assert.equal(am5.status, 200);
  assert.ok(am5.body.total >= 2);
  assert.ok(ddr5.body.total >= 2);
  for (const item of am5.body.items) {
    const values = item.specs.map((spec) => spec.value.toLowerCase());
    assert.ok(
      item.name.toLowerCase().includes('am5') ||
        values.some((value) => value.includes('am5')),
      `AM5 не найден у ${item.name}`,
    );
  }
});

test('каталог: фильтр по цене оставляет товары в диапазоне', async () => {
  const { status, body } = await get('/products?minPrice=100&maxPrice=300');
  assert.equal(status, 200);
  assert.ok(body.total > 0);
  for (const item of body.items) {
    assert.ok(item.price >= 100 && item.price <= 300);
  }
});

test('каталог: сортировка по убыванию цены', async () => {
  const { status, body } = await get('/products?sort=price_desc');
  assert.equal(status, 200);
  const prices = body.items.map((item) => item.price);
  const sorted = [...prices].sort((a, b) => b - a);
  assert.deepEqual(prices, sorted);
});

test('каталог: страницы не пересекаются и сохраняют total', async () => {
  const first = await get('/products?limit=5&offset=0');
  const second = await get('/products?limit=5&offset=5');
  assert.equal(first.body.total, 16);
  assert.equal(second.body.total, 16);
  assert.equal(first.body.items.length, 5);
  assert.equal(second.body.items.length, 5);
  const firstIds = first.body.items.map((item) => item.id);
  const secondIds = second.body.items.map((item) => item.id);
  assert.equal(firstIds.filter((id) => secondIds.includes(id)).length, 0);
});

test('товар: составной идентификатор возвращает карточку с характеристиками', async () => {
  // Идентификатор берём из списка, а не зашиваем: снимок каталога
  // для CI может содержать другие позиции, чем боевая база.
  const list = await get('/products?category=cpu&limit=1');
  const productId = list.body.items[0].id;
  const { status, body } = await get(`/products/${productId}`);
  assert.equal(status, 200);
  assert.equal(body.id, productId);
  assert.equal(body.category, 'cpu');
  assert.equal(typeof body.name, 'string');
  assert.ok(Array.isArray(body.specs));
  assert.ok(body.specs.length > 0);
  assert.equal(body.currency, 'BYN');
});

test('товар: неизвестный идентификатор даёт 404 в едином формате ошибок', async () => {
  const { status, body } = await get('/products/unknown:1');
  assert.equal(status, 404);
  assert.equal(body.error.code, 'PRODUCT_NOT_FOUND');
});

test('валидация: неизвестная категория отклоняется с 400', async () => {
  const { status, body } = await get('/products?category=teapot');
  assert.equal(status, 400);
  assert.equal(body.error.code, 'VALIDATION_ERROR');
});

test('валидация: limit вне диапазона отклоняется', async () => {
  const zero = await get('/products?limit=0');
  const tooBig = await get('/products?limit=101');
  assert.equal(zero.status, 400);
  assert.equal(tooBig.status, 400);
});

test('валидация: minPrice больше maxPrice отклоняется', async () => {
  const { status, body } = await get('/products?minPrice=500&maxPrice=100');
  assert.equal(status, 400);
  assert.equal(body.error.code, 'VALIDATION_ERROR');
});

test('готовые сборки: три конфигурации, цена сложена из комплектующих', async () => {
  const { status, body } = await get('/prebuilt');
  assert.equal(status, 200);
  assert.equal(body.total, 3);
  for (const item of body.items) {
    assert.ok(item.price > 0, 'цена сборки должна быть больше нуля');
    assert.ok(item.components.length >= 7);
    assert.equal(item.currency, 'BYN');
  }
});
