# =====================================================================
#  PCHelper (ЛР4) — сборка веб-приложения
#  Лабораторная работа № 4, задание 6, пункт 8.
#
#  Два этапа:
#    build — сборка статики (в демо-режиме это готовая страница из public/,
#            в рабочем проекте здесь npm run build для React + Vite);
#    prod  — раздача собранной статики через nginx.
#
#  ВАЖНО: этот образ демонстрирует работу окружения (пункт 9 задания 6).
#  Он не содержит кода курсовой работы и не связан с исходным кодом
#  приложения из папки «Курсовая работа/Приложение/pchelper».
# =====================================================================

# ---------- Этап 1: подготовка статики ----------
FROM node:20-alpine AS build
WORKDIR /app

# Для реального React-проекта на этом этапе выполняется:
#   COPY package*.json ./
#   RUN npm ci
#   COPY . .
#   ARG VITE_API_URL=/api/v1
#   ENV VITE_API_URL=$VITE_API_URL
#   RUN npm run build
# и результат класть в /app/dist.

# Демо-режим: статика уже готова, копируем её как есть.
COPY public/ ./dist/

# ---------- Этап 2: раздача ----------
FROM nginx:1.27-alpine AS prod

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Healthcheck: nginx должен отвечать на главной странице.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]