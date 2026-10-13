/**
 * Smoke-тесты окружения (ЛР4, задание 6).
 *
 * Запускаются ВНУТРИ контейнера командой `node --test tests/`.
 * Особенность: никаких внешних зависимостей — используется встроенный
 * раннер node:test. Благодаря этому проверка работоспособности собранного
 * образа не требует установки vitest и supertest и выполняется за секунды.
 *
 * Применяется в контейнере `tests` профиля test:
 *     docker compose --profile test run --rm tests
 */

import test from 'node:test';
import assert from 'node:assert/strict';

// Адрес сервиса внутри сети docker-compose.
const BASE = process.env.BASE_URL || 'http://api:3001';

/**
 * Вспомогательная функция: выполняет GET-запрос и возвращает
 * статус ответа вместе с распарсенным JSON-телом.
 */
async function getJson(path, headers = {}) {
  const res = await fetch(`${BASE}${path}`, { headers });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

test('пункт 13 задания 1: маршрут /api/v1/health отвечает 200 и status=ok', async () => {
  const { status, body } = await getJson('/api/v1/health');
  assert.equal(status, 200, `ожидался статус 200, получен ${status}`);
  assert.equal(body.status, 'ok');
  assert.equal(typeof body.uptimeSeconds, 'number');
});

test('пункт 9 задания 6: маршрут /api/v1/hello возвращает приветствие PCHelper', async () => {
  const { status, body } = await getJson('/api/v1/hello');
  assert.equal(status, 200);
  assert.match(body.message, /Hello, PCHelper!/);
  assert.ok(body.capabilities, 'в ответе должна быть секция capabilities');
});

test('пункт 9 задания 6: контейнер видит переменные окружения', async () => {
  const { body } = await getJson('/api/v1/hello');
  assert.equal(typeof body.capabilities.databaseConfigured, 'boolean');
  assert.equal(typeof body.capabilities.cacheConfigured, 'boolean');
});

test('требование FR-08: админ-маршрут без токена возвращает 403', async () => {
  const { status, body } = await getJson('/api/v1/admin/orders');
  assert.equal(status, 403, `ожидался статус 403, получен ${status}`);
  assert.equal(body.error.code, 'FORBIDDEN');
});

test('требование FR-08: админ-маршрут с верным токеном возвращает 200', async () => {
  const token = process.env.ADMIN_TOKEN || 'dev-admin-token';
  const { status, body } = await getJson('/api/v1/admin/orders', {
    Authorization: `Bearer ${token}`,
  });
  assert.equal(status, 200);
  assert.ok(Array.isArray(body.items), 'ожидался массив заказов');
});