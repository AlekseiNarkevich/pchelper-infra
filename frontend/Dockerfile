# =====================================================================
#  PCHelper (ЛР7) — сборка веб-витрины
#
#  Два этапа:
#    build — установка зависимостей и vite build (React);
#    prod  — раздача собранной статики через nginx с проксированием /api.
#
#  Аргумент VITE_API_URL задаёт адрес API, вшиваемый в бандл.
#  В контейнере используется относительный /api/v1: nginx проксирует
#  его на сервис api, поэтому один и тот же образ работает локально
#  и на Render.
# =====================================================================

# ---------- Этап 1: сборка статики ----------
FROM node:22-alpine AS build
WORKDIR /app

# Сначала только манифесты — слой зависимостей кешируется отдельно
# от исходников и пересобирается лишь при изменении package-lock.json.
COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .

ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ---------- Этап 2: раздача ----------
FROM nginx:1.27-alpine AS prod

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Healthcheck: nginx должен отвечать на главной странице.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
