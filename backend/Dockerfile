# =====================================================================
#  PCHelper (ЛР4) — многостадийная сборка backend
#  Лабораторная работа № 4, задание 6, пункт 8.
#
#  ВАЖНО: собирается МИНИМАЛЬНЫЙ сервис из infra/backend, который не
#  является частью курсовой работы и никак не связан с исходным кодом
#  приложения из папки «Курсовая работа/Приложение/pchelper».
#
#  Три этапа:
#    deps  — установка production-зависимостей в отдельный слой,
#            чтобы Docker кэшировал npm ci и не переустанавливал пакеты
#            при каждом изменении исходников;
#    dev   — образ с dev-зависимостями и исходниками тестов;
#    prod  — итоговый минимальный образ: без dev-зависимостей,
#            под непривилегированным пользователем, с healthcheck.
# =====================================================================

# ---------- Этап 1: только production-зависимости ----------
FROM node:20-alpine AS deps
WORKDIR /app

# Копируем только манифесты — слой инвалидируется лишь при их изменении
COPY package*.json ./

# npm ci (а не npm install) — установка строго по package-lock.json
RUN npm ci --omit=dev


# ---------- Этап 2: разработка и тесты ----------
FROM node:20-alpine AS dev
WORKDIR /app

ENV NODE_ENV=development

# Здесь ставятся ВСЕ зависимости, включая vitest и supertest для юнит-тестов
COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 3001

# Команда запуска переопределяется в docker-compose.yml
CMD ["npm", "run", "dev"]


# ---------- Этап 3: production ----------
FROM node:20-alpine AS prod
WORKDIR /app

# Режим работы и порт, который слушает приложение ВНУТРИ контейнера
ENV NODE_ENV=production \
    PORT=3001

# tini — минимальный init-процесс. Нужен, чтобы SIGTERM от Docker Compose
# доходил до node: иначе контейнер завершается без обработки текущих запросов.
RUN apk add --no-cache tini

# Забираем node_modules из слоя deps (dev-зависимости туда не попали)
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./

# Исходники приложения
COPY src ./src

# Тот же пользователь отступает, что и в Курсач_структура БД.txt:
# непривилегированный пользователь внутри контейнера.
RUN addgroup -S pchelper && adduser -S pchelper -G pchelper \
    && chown -R pchelper:pchelper /app
USER pchelper

# Порт, который приложение слушает ВНУТРИ контейнера
EXPOSE 3001

# Проверка живости: опрашиваем /api/v1/health каждые 30 секунд.
# Порт берётся из переменной окружения, а не зашивается:
# локально это 3001, а Render назначает контейнеру случайный порт
# и передаёт его через PORT. С жёстко зашитым 3001 проверка
# ходила бы в пустоту и помечала контейнер как unhealthy.
# Форма команды — через shell (/bin/sh), чтобы ${PORT} подставился.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- "http://127.0.0.1:${PORT:-3001}/api/v1/health" || exit 1

# tini обязателен первой в ENTRYPOINT
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/server.js"]