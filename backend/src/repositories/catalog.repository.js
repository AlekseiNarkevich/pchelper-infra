/**
 * PCHelper (ЛР7) — репозиторий каталога.
 *
 * Единственное место, которое знает, откуда берутся товары: из Supabase
 * или из демонстрационной фикстуры. Маршруты и тесты работают с готовыми
 * объектами и не зависят от источника данных.
 *
 * @version 1.0
 */

import { CATEGORIES, CATEGORY_BY_ID, mapRowToProduct } from '../domain/catalog.js';
import { FIXTURE_PREBUILT, FIXTURE_PRODUCTS } from '../data/catalog.fixture.js';
import { fetchTable, isDatabaseConnected } from '../services/supabase.service.js';

/**
 * Загружает товары одной категории.
 *
 * @param {object} category Описание категории.
 * @returns {Promise<object[]>} Товары в едином формате.
 */
async function loadCategory(category) {
  if (!isDatabaseConnected()) {
    return FIXTURE_PRODUCTS.filter((p) => p.category === category.id);
  }
  const rows = await fetchTable(category.table);
  return rows.map((row) => mapRowToProduct(category.id, row));
}

/**
 * Загружает товары всех категорий.
 *
 * @returns {Promise<object[]>} Плоский список товаров.
 */
async function loadAllProducts() {
  if (!isDatabaseConnected()) return [...FIXTURE_PRODUCTS];
  const groups = await Promise.all(CATEGORIES.map(loadCategory));
  return groups.flat();
}

/**
 * Список категорий с количеством товаров.
 *
 * @returns {Promise<{items: object[], total: number}>}
 */
export async function listCategories() {
  const counts = new Map();
  if (isDatabaseConnected()) {
    const groups = await Promise.all(
      CATEGORIES.map(async (category) => {
        const rows = await fetchTable(category.table);
        return [category.id, rows.length];
      }),
    );
    for (const [id, count] of groups) counts.set(id, count);
  } else {
    for (const product of FIXTURE_PRODUCTS) {
      counts.set(product.category, (counts.get(product.category) || 0) + 1);
    }
  }

  const items = CATEGORIES.map((category) => ({
    id: category.id,
    name: category.name,
    description: category.description,
    count: counts.get(category.id) || 0,
  }));
  return { items, total: items.length };
}

/**
 * Приводит строку поиска к нижнему регистру и убирает лишние пробелы.
 *
 * @param {string} value Строка из запроса.
 * @returns {string}
 */
function normalize(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

/**
 * Фильтрует, сортирует и отдаёт страницу каталога.
 *
 * @param {object} params Параметры запроса.
 * @param {string} [params.category] Код категории.
 * @param {string} [params.search] Подстрока в названии.
 * @param {number} [params.minPrice] Минимальная цена.
 * @param {number} [params.maxPrice] Максимальная цена.
 * @param {string} [params.sort] Вариант сортировки.
 * @param {number} [params.limit] Размер страницы.
 * @param {number} [params.offset] Смещение.
 * @returns {Promise<{items: object[], total: number, limit: number, offset: number}>}
 */
export async function listProducts(params = {}) {
  const {
    category,
    search,
    minPrice,
    maxPrice,
    sort = 'price_asc',
    limit = 20,
    offset = 0,
  } = params;

  let products = category
    ? await loadCategory(CATEGORY_BY_ID.get(category))
    : await loadAllProducts();

  if (search) {
    const needle = normalize(search);
    products = products.filter((p) => normalize(p.name).includes(needle));
  }
  if (minPrice !== undefined) products = products.filter((p) => p.price >= minPrice);
  if (maxPrice !== undefined) products = products.filter((p) => p.price <= maxPrice);

  products.sort((a, b) => {
    if (sort === 'price_desc') return b.price - a.price;
    if (sort === 'name_asc') return a.name.localeCompare(b.name, 'ru');
    return a.price - b.price;
  });

  const total = products.length;
  const items = products.slice(offset, offset + limit);
  return { items, total, limit, offset };
}

/**
 * Находит товар по составному идентификатору «категория:номер».
 *
 * @param {string} productId Идентификатор вида «cpu:1».
 * @returns {Promise<object|null>} Товар или null.
 */
export async function getProduct(productId) {
  const [categoryId, rawId] = String(productId).split(':');
  const category = CATEGORY_BY_ID.get(categoryId);
  if (!category || !rawId) return null;

  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) return null;

  if (!isDatabaseConnected()) {
    return FIXTURE_PRODUCTS.find((p) => p.id === `${categoryId}:${id}`) || null;
  }

  const rows = await fetchTable(category.table);
  const row = rows.find((item) => Number(item.id) === id);
  return row ? mapRowToProduct(categoryId, row) : null;
}

/**
 * Собирает готовые конфигурации с названиями и ценами комплектующих.
 *
 * В базе конфигурация хранится ссылками на восемь таблиц, а цена сборки
 * отдельным полем не хранится — она складывается из цен деталей.
 * Чтобы не делать восемь запросов на каждую сборку, таблицы читаются
 * один раз и раскладываются в словари «id → название» и «id → цена».
 *
 * @returns {Promise<{items: object[], total: number}>}
 */
export async function listPrebuilt() {
  if (!isDatabaseConnected()) {
    return { items: FIXTURE_PREBUILT, total: FIXTURE_PREBUILT.length };
  }

  const rows = await fetchTable('ГотовыеКонфигурации');
  const tables = await Promise.all(
    CATEGORIES.map(async (category) => [category, await fetchTable(category.table)]),
  );
  const storageLinks = await fetchTable('КонфигурацияНакопители');

  const names = new Map();
  const prices = new Map();
  for (const [category, list] of tables) {
    for (const row of list) {
      const key = `${category.id}:${row.id}`;
      names.set(key, row['название']);
      prices.set(key, Number(row['цена'] ?? 0));
    }
  }

  const componentFields = [
    ['cpu', 'процессор_id'],
    ['motherboard', 'материнская_плата_id'],
    ['ram', 'озу_id'],
    ['gpu', 'видеокарта_id'],
    ['psu', 'блокпитания_id'],
    ['case', 'корпус_id'],
    ['cooling', 'охлаждение_id'],
  ];

  const items = rows.map((row) => {
    const components = componentFields
      .filter(([, field]) => row[field] !== null && row[field] !== undefined)
      .map(([category, field]) => ({
        category,
        name: names.get(`${category}:${row[field]}`) || '—',
        price: prices.get(`${category}:${row[field]}`) ?? 0,
      }));

    // Накопителей у сборки может быть несколько — они лежат в отдельной
    // таблице связей, поэтому добавляются после фиксированных семи полей.
    for (const link of storageLinks) {
      if (Number(link['конфигурация_id']) !== Number(row.id)) continue;
      const key = `storage:${link['накопитель_id']}`;
      components.push({
        category: 'storage',
        name: names.get(key) || '—',
        price: prices.get(key) ?? 0,
      });
    }

    const price = components.reduce((sum, c) => sum + c.price, 0);

    return {
      id: row.id,
      name: row['название'] || 'Без названия',
      task: row['задачи'] || '',
      price,
      currency: 'BYN',
      imageUrl: row['фото_url'] || null,
      components,
      componentCount: components.length,
    };
  });

  return { items, total: items.length };
}
