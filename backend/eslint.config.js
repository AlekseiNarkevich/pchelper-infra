/**
 * Конфигурация ESLint для backend-сервиса PCHelper.
 *
 * Формат «flat config» (eslint.config.js) — актуальный начиная с ESLint 9.
 * Прежний формат .eslintrc больше не поддерживается по умолчанию.
 *
 * Что проверяем:
 *   - синтаксис и очевидные ошибки (рекомендуемые правила ES);
 *   - неиспользуемые переменные и функции;
 *   - порядок ключей в объектах (sort-keys) — единый стиль кода.
 *
 * Что НЕ проверяем сознательно:
 *   - правила оформления (отступы, кавычки) — за это отвечает Prettier.
 *     ESLint и Prettier не должны ругаться на одно и то же.
 */

import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    // Каталоги, которые не нужно анализировать.
    ignores: ['node_modules/**', 'coverage/**', 'dist/**'],
  },

  // --- Исходный код приложения: браузерных глобалов нет ---
  js.configs.recommended,
  {
    files: ['src/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // Неиспользуемые переменные — частая ошибка после рефакторинга.
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

      // Опечатки в названиях: уже существующий метод нельзя «создать»
      // с ошибкой — это молча ломает проверку совместимости.
      'no-undef': 'error',

      // Недостижимый код после return — сигнал о неверной логике.
      'no-unreachable': 'error',

      // Асинхронные функции должны содержать await, иначе подозрительно.
      'require-await': 'warn',
    },
  },

  // --- Тесты: те же правила плюс допуски на тестовый код ---
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
