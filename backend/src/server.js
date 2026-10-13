/**
 * PCHelper (ЛР4) — точка входа backend-сервиса.
 *
 * Единственная задача этого файла — поднять HTTP-сервер на порту,
 * заданном переменной окружения PORT (по умолчанию 3001).
 * Вся конфигурация приложения вынесена в app.js, чтобы её можно было
 * использовать в тестах без открытия порта.
 */

import { createApp } from './app.js';

const PORT = Number(process.env.PORT || 3001);
const app = createApp();

// process.env.NODE_ENV передаётся docker-compose через docker-compose.yml
app.listen(PORT, '0.0.0.0', () => {
  // Сообщение в stdout нужно для скриншота из раздела 6.5.4 отчёта
  console.log(`[pchelper-api] Сервер запущен: http://0.0.0.0:${PORT}`);
  console.log(`[pchelper-api] Режим: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[pchelper-api] Проверка:  http://localhost:${PORT}/api/v1/health`);
  console.log(`[pchelper-api] Hello:     http://localhost:${PORT}/api/v1/hello`);
});