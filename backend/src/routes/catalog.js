/**
 * PCHelper (ЛР7) — маршруты каталога.
 *
 *   GET /api/v1/categories          восемь категорий с количеством товаров
 *   GET /api/v1/products            список с фильтрами, сортировкой и страницами
 *   GET /api/v1/products/:id        один товар по составному идентификатору
 *   GET /api/v1/prebuilt            готовые сборки с составом и ценой
 *
 * Все ошибки возвращаются в едином формате { error: { code, message } },
 * который уже используется остальными маршрутами сервиса (NFR-09).
 *
 * @version 1.0
 */

import { Router } from 'express';

import { isCategory, SORTS } from '../domain/catalog.js';
import {
  getProduct,
  listCategories,
  listPrebuilt,
  listProducts,
} from '../repositories/catalog.repository.js';

const router = Router();

/** Максимальный размер страницы: защита от запроса «все товары сразу». */
const MAX_LIMIT = 100;

/**
 * Оборачивает асинхронный обработчик, чтобы ошибка попала в middleware
 * Express, а не осталась необработанным отклонённым промисом.
 *
 * @param {(req: object, res: object) => Promise<void>} handler Обработчик.
 * @returns {(req: object, res: object, next: Function) => void}
 */
function asyncHandler(handler) {
  return (req, res, next) => {
    // void подчёркивает, что промис обрабатывается через catch,
    // а не возвращается наружу: SonarCloud иначе считает это
    // необработанным промисом (правило S6544).
    void handler(req, res).catch(next);
  };
}

/**
 * Создаёт ошибку валидации с кодом 400.
 *
 * @param {string} message Текст для клиента.
 * @returns {Error & { status: number, code: string }}
 */
function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  error.code = 'VALIDATION_ERROR';
  return error;
}

/**
 * Разбирает целое число из query-параметра.
 *
 * @param {unknown} value Значение параметра.
 * @param {object} options Границы и имя параметра.
 * @returns {number|undefined} Число или undefined, если параметра нет.
 */
function parseInteger(value, { name, min, max }) {
  if (value === undefined || value === '') return undefined;
  const number = Number(value);
  if (!Number.isInteger(number)) {
    throw badRequest(`Параметр «${name}» должен быть целым числом`);
  }
  if (number < min || number > max) {
    throw badRequest(`Параметр «${name}» должен быть от ${min} до ${max}`);
  }
  return number;
}

/**
 * Разбирает необязательное число с плавающей точкой.
 *
 * @param {unknown} value Значение параметра.
 * @param {string} name Имя параметра.
 * @returns {number|undefined}
 */
function parsePrice(value, name) {
  if (value === undefined || value === '') return undefined;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    throw badRequest(`Параметр «${name}» должен быть неотрицательным числом`);
  }
  return number;
}

/** GET /api/v1/categories */
router.get(
  '/categories',
  asyncHandler(async (req, res) => {
    const data = await listCategories();
    res.status(200).json(data);
  }),
);

/** GET /api/v1/products */
router.get(
  '/products',
  asyncHandler(async (req, res) => {
    const { category, search, sort } = req.query;

    if (category !== undefined && !isCategory(category)) {
      throw badRequest(`Неизвестная категория: ${category}`);
    }
    if (sort !== undefined && !SORTS.includes(sort)) {
      throw badRequest(`Допустимые варианты сортировки: ${SORTS.join(', ')}`);
    }

    const limit = parseInteger(req.query.limit, {
      name: 'limit',
      min: 1,
      max: MAX_LIMIT,
    });
    const offset = parseInteger(req.query.offset, {
      name: 'offset',
      min: 0,
      max: 100000,
    });
    const minPrice = parsePrice(req.query.minPrice, 'minPrice');
    const maxPrice = parsePrice(req.query.maxPrice, 'maxPrice');

    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      throw badRequest('minPrice не может быть больше maxPrice');
    }

    const data = await listProducts({
      category,
      search,
      minPrice,
      maxPrice,
      sort,
      limit: limit ?? 20,
      offset: offset ?? 0,
    });
    res.status(200).json(data);
  }),
);

/** GET /api/v1/products/:id — идентификатор вида «cpu:1». */
router.get(
  '/products/:id',
  asyncHandler(async (req, res) => {
    const product = await getProduct(req.params.id);
    if (!product) {
      return res.status(404).json({
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: `Товар «${req.params.id}» не найден`,
        },
      });
    }
    return res.status(200).json(product);
  }),
);

/** GET /api/v1/prebuilt */
router.get(
  '/prebuilt',
  asyncHandler(async (req, res) => {
    const data = await listPrebuilt();
    res.status(200).json(data);
  }),
);

export default router;
