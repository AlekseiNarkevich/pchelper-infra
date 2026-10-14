/**
 * Юнит-тесты backend-сервиса (ЛР4, задание 6, пункт 6).
 *
 * Запускаются командой `node --test tests/` ДО сборки Docker-образа.
 * Тесты используют встроенный раннер node:test и глобальный fetch,
 * поэтому внешних зависимостей (vitest, supertest) не требуется —
 * образ с тестами собирается быстро и весит мало.
 *
 * Приложение поднимается на случайном свободном порту прямо в процессе
 * теста, поэтому проверяется ровно тот код, который попадёт в образ.
 */

import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

// Порт и базовый URL заполняются в before(), когда сервер уже поднят.
let server;
let BASE;
const ADMIN_TOKEN = 'test-admin-token';

// Токен подставляется до создания приложения: middleware читает его
// из переменной окружения при каждом запросе.
process.env.ADMIN_TOKEN = ADMIN_TOKEN;

before(async () => {
  // Слушаем порт 0 — операционная система выдаст свободный автоматически.
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  BASE = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

/** Вспомогательная функция: GET-запрос с разбором JSON-ответа. */
async function get(path, headers = {}) {
  const res = await fetch(`${BASE}${path}`, { headers });
  const text = await res.text();
  // Тело может оказаться не-JSON (например, HTML-страница nginx),
  // поэтому разбор не должен ронять тест.
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

test('проверка работоспособности: GET /api/v1/health возвращает 200 и status=ok', async () => {
  const { status, body } = await get('/api/v1/health');
  assert.equal(status, 200);
  assert.equal(body.status, 'ok');
  assert.equal(typeof body.version, 'string');
});

test('пункт 9 задания 6: GET /api/v1/hello возвращает приветствие PCHelper', async () => {
  const { status, body } = await get('/api/v1/hello');
  assert.equal(status, 200);
  assert.match(body.message, /Hello, PCHelper!/);
  assert.equal(body.service, 'pchelper-api');
});

test('пункт 9 задания 6: ответ содержит сведения о переменных окружения', async () => {
  const { body } = await get('/api/v1/hello');
  assert.equal(typeof body.capabilities.databaseConfigured, 'boolean');
  assert.equal(typeof body.capabilities.cacheConfigured, 'boolean');
  assert.equal(typeof body.capabilities.authConfigured, 'boolean');
});

test('проверка БД: без DATABASE_URL маршрут /hello/db отвечает 503', async () => {
  const previous = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  try {
    const { status, body } = await get('/api/v1/hello/db');
    assert.equal(status, 503, 'ожидался статус 503 при отсутствии DATABASE_URL');
    assert.equal(body.status, 'degraded');
  } finally {
    if (previous !== undefined) process.env.DATABASE_URL = previous;
  }
});

test('требование FR-08: админ-маршрут без токена возвращает 403', async () => {
  const { status, body } = await get('/api/v1/admin/orders');
  assert.equal(status, 403);
  assert.equal(body.error.code, 'FORBIDDEN');
});

test('требование FR-08: админ-маршрут с неверным токеном тоже возвращает 403', async () => {
  const { status } = await get('/api/v1/admin/orders', {
    Authorization: 'Bearer wrong-token-value',
  });
  assert.equal(status, 403);
});

test('требование FR-08: админ-маршрут с верным токеном возвращает 200', async () => {
  const { status, body } = await get('/api/v1/admin/orders', {
    Authorization: `Bearer ${ADMIN_TOKEN}`,
  });
  assert.equal(status, 200);
  assert.ok(Array.isArray(body.items));
  assert.equal(body.total, 0);
});

test('корневой адрес отдаёт визитку со списком маршрутов, а не 404', async () => {
  const { status, body } = await get('/');
  assert.equal(status, 200);
  assert.equal(body.service, 'PCHelper Infrastructure API');
  assert.equal(typeof body.endpoints.health, 'string');
});

test('несуществующий маршрут возвращает 404 в формате JSON, а не HTML', async () => {
  const { status, body } = await get('/api/v1/не-существует');
  assert.equal(status, 404);
  // Требование NFR-09: все ошибки в одном формате { error: { code, message } }
  assert.equal(body.error.code, 'NOT_FOUND');
  assert.match(body.error.message, /не найден/);
});
