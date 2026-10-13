/**
 * PCHelper (ЛР4) — конфигурация Express-приложения.
 *
 * Это МИНИМАЛЬНЫЙ сервис для задания 6 лабораторной работы № 4.
 * Он не является частью курсовой работы и никак не связан с исходным
 * кодом приложения из папки «Курсовая работа/Приложение/pchelper».
 *
 * Зачем он нужен: пункт 9 задания 6 требует «добавить простое приложение
 * типа Hello World для иллюстрации работоспособности каждого настроенного
 * окружения». Именно этот сервис Docker собирает в образ, запускает
 * в контейнере, проверяет healthcheck'ом и деплоит на Render.
 */

import express from 'express';
import helloRouter from './routes/hello.js';
import adminRouter from './routes/admin.js';

// Момент запуска — чтобы в ответе /api/v1/hello показывать время работы процесса.
const STARTED_AT = Date.now();

/**
 * Создаёт и настраивает Express-приложение.
 *
 * Вынесено в отдельную функцию, а не в module scope, чтобы тесты могли
 * создать приложение в памяти (без прослушивания порта) и обращаться к нему
 * через supertest.
 *
 * @returns {import('express').Express} Готовое к запуску приложение.
 */
export function createApp() {
  const app = express();

  // --- Базовая обвязка ---
  app.use(express.json()); // разбор тела запроса в JSON

  // --- Требование FR-08: разграничение доступа по ролям ---
  // Middleware проверяет заголовок Authorization и имитирует реальную
  // проверку роли. В учебном окружении роль задаётся переменной окружения,
  // чтобы можно было проверить оба сценария: 200 и 403.
  app.use('/api/v1/admin', (req, res, next) => {
    const expected = process.env.ADMIN_TOKEN || 'dev-admin-token';
    const provided = (req.headers.authorization || '').replace('Bearer ', '');
    if (provided !== expected) {
      return res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Требуется роль manager' },
      });
    }
    return next();
  });

  // --- Маршруты ---
  // Пункт 13 задания 1: перед проектированием API зафиксировать
  // служебный маршрут проверки работоспособности.
  app.get('/api/v1/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
      version: '1.0.0',
      uptimeSeconds: Math.floor((Date.now() - STARTED_AT) / 1000),
      timestamp: new Date().toISOString(),
    });
  });

  // Пункт 9 задания 6 — приложение типа «Hello World».
  app.use('/api/v1', helloRouter);

  // Защищённый админ-модуль: доступ проверяет middleware выше по цепочке.
  app.use('/api/v1/admin', adminRouter);

  // --- Единый формат ошибок (требование NFR-09) ---
  // 404: неизвестный маршрут. Express по умолчанию отдал бы HTML-страницу,
  // но клиенту нужен JSON того же вида, что и у остальных ошибок.
  app.use((req, res) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Маршрут ${req.method} ${req.originalUrl} не найден`,
      },
    });
  });

  // 500: необработанная ошибка в одном из маршрутов.
  // Обработчик ошибок Express обязан принимать ровно четыре аргумента
  // (err, req, res, next) — иначе Express не признает его обработчиком.
  // Сам next здесь не нужен, поэтому он назван с подчёркиванием:
  // правило no-unused-vars разрешает неиспользуемые аргументы,
  // начинающиеся с «_».
  app.use((err, req, res, _next) => {
    console.error('[api] необработанная ошибка:', err.message);
    res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: err.message || 'Ошибка сервера' },
    });
  });

  return app;
}
