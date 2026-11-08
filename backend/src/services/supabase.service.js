/**
 * PCHelper (ЛР7) — доступ к Supabase.
 *
 * Клиент создаётся только при наличии переменных окружения. Если их нет
 * (CI, локальный запуск без .env, юнит-тесты), приложение продолжает
 * работать на демонстрационном каталоге: это позволяет проверять API
 * и конвейер без секретов и без сети.
 *
 * Переменные окружения:
 *   SUPABASE_URL                адрес проекта;
 *   SUPABASE_SERVICE_ROLE_KEY   серверный ключ (обходит RLS) — приоритет;
 *   SUPABASE_ANON_KEY           публичный ключ, если RLS разрешает чтение.
 *
 * @version 1.0
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_SECRET_KEY;

/** Клиент Supabase или null, если окружение не настроено. */
export const supabase = url && key ? createClient(url, key) : null;

/** Признак того, что API читает данные из базы, а не из фикстуры. */
export function isDatabaseConnected() {
  return supabase !== null;
}

/**
 * Читает все строки таблицы.
 *
 * Таблицы каталога небольшие (10–15 строк), поэтому пагинация на стороне
 * Supabase не нужна: фильтры и сортировка выполняются в репозитории.
 * Когда каталог вырастет, сюда добавится range() и count.
 *
 * @param {string} table Имя таблицы в Supabase (кириллицей).
 * @returns {Promise<object[]>} Строки таблицы.
 */
export async function fetchTable(table) {
  if (!supabase) throw new Error('Supabase не настроен');
  const { data, error } = await supabase.from(table).select('*');
  if (error) throw new Error(`Supabase: ${error.message}`);
  return data || [];
}
