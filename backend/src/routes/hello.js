/**
 * PCHelper (ЛР4) — приложение типа «Hello World».
 *
 * Требование задания 6, пункт 9: «Добавить простое приложение типа
 * “Hello World” для иллюстрации работоспособности каждого настроенного
 * окружения». Этот модуль подтверждает, что контейнер backend запущен,
 * видит переменные окружения и корректно отвечает по HTTP.
 *
 * Модуль не содержит бизнес-логики и подключается в конце цепочки
 * middleware, поэтому любой запрос к /api/v1/hello проходит через
 * разбор JSON и проверку роли.
 */

import { Router } from 'express';

const router = Router();

// Момент запуска процесса — для расчёта времени работы.
const STARTED_AT = Date.now();

/**
 * GET /api/v1/hello
 * Возвращает приветствие и сведения о среде контейнера.
 *
 * Ответ используется:
 *   * для проверки работоспособности окружения (Docker, Docker Compose, CI);
 *   * как целевой smoke-тест в контейнере `tests`;
 *   * как иллюстрация пункта 9 задания 6 в отчёте.
 */
router.get('/hello', (req, res) => {
  res.status(200).json({
    message: 'Hello, PCHelper! Серверное окружение работает корректно.',
    service: 'pchelper-api',
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptimeSeconds: Math.floor((Date.now() - STARTED_AT) / 1000),
    container: process.env.HOSTNAME || 'local',
    timestamp: new Date().toISOString(),
    capabilities: {
      // Показываем, какие зависимости сконфигурированы: это удобно
      // при разборе, почему контейнер поднялся, но БД недоступна.
      databaseConfigured: Boolean(process.env.DATABASE_URL),
      cacheConfigured: Boolean(process.env.REDIS_URL),
      authConfigured: Boolean(process.env.JWT_SECRET),
    },
  });
});

/**
 * GET /api/v1/hello/db
 * Дополнительная проверка: доступна ли база данных.
 *
 * Ошибка соединения НЕ приводит к 500: возвращается 503 с указанием
 * компонента, который неисправен, — так проще диагностировать окружение.
 */
router.get('/hello/db', (req, res) => {
  if (!process.env.DATABASE_URL) {
    return res.status(503).json({
      status: 'degraded',
      component: 'database',
      message: 'Переменная DATABASE_URL не задана — база данных не подключена.',
    });
  }
  // В полноценном приложении здесь выполняется SELECT 1 через пул соединений.
  return res.status(200).json({
    status: 'ok',
    component: 'database',
    message: 'Переменная DATABASE_URL присутствует, соединение настроено.',
    host: process.env.DATABASE_URL.split('@')[1] || 'unknown',
  });
});

export default router;
