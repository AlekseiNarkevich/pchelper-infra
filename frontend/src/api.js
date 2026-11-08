/**
 * Клиент API каталога.
 *
 * Базовый адрес берётся из VITE_API_URL (в Docker-сборке это /api/v1).
 * В режиме разработки запросы уходят на тот же origin и проксируются
 * на localhost:3001 — см. vite.config.js.
 */

const BASE = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/+$/, '');

/**
 * Выполняет GET-запрос и разбирает ошибку в понятный текст.
 *
 * @param {string} path Путь относительно базового адреса.
 * @param {number} timeoutMs Тайм-аут запроса.
 * @returns {Promise<object>}
 */
async function request(path, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${BASE}${path}`, { signal: controller.signal });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const message = body?.error?.message || `Сервер ответил ${response.status}`;
      throw new Error(message);
    }
    return body;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Сервер не ответил вовремя. Попробуйте ещё раз.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/** Собирает query-строку, пропуская пустые значения. */
function query(params) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

export const getCategories = () => request('/categories');

export const getProducts = (params = {}) => request(`/products${query(params)}`);

export const getProduct = (id) => request(`/products/${encodeURIComponent(id)}`);

export const getPrebuilt = () => request('/prebuilt');

/** Форматирует цену в белорусских рублях. */
export function money(value) {
  const number = Number(value || 0);
  return `${new Intl.NumberFormat('ru-RU').format(number)} BYN`;
}
