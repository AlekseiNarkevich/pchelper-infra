/**
 * PCHelper (ЛР4) — единая точка входа REST API (иллюстрация для задания 6).
 *
 * Служебные маршруты:
 *   GET /api/v1/health      — проверка работоспособности (пункт 13 задания 1);
 *   GET /api/v1/hello       — приложение «Hello World» (пункт 9 задания 6);
 *   GET /api/v1/hello/db    — проверка подключения к базе данных;
 *   GET /api/v1/admin/orders — защищённый маршрут (требование FR-08).
 */

import { Router } from 'express';

const router = Router();

/**
 * GET /api/v1/admin/orders
 * Пример защищённого маршрута: доступен только с ролью manager.
 * Проверка роли выполняется middleware в app.js — здесь сам маршрут.
 */
router.get('/orders', (req, res) => {
  res.status(200).json({
    items: [],
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    note: 'Заглушка: полноценный модуль заказов реализуется в курсовой работе.',
  });
});

export default router;