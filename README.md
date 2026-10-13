# PCHelper — инфраструктура разработки и развёртывания

Материалы задания 6 лабораторной работы № 4: Docker, Docker Compose,
непрерывная интеграция, проверка качества кода и развёртывание.

> **Куда это класть.** В лабораторной работе эти файлы лежат в `ЛР4/infra/`
> как готовые материалы. В рабочем репозитории их раскладывают так:
>
> | Из | Куда |
> |----|------|
> | `infra/docker-compose.yml` | корень репозитория `pchelper` |
> | `infra/backend/` | репозиторий `pchelper-api` |
> | `infra/frontend/` | репозиторий `pchelper-web` |
> | `infra/.github/workflows/ci.yml` | `.github/workflows/ci.yml` репозитория `pchelper` |
> | `infra/sonar-project.properties` | корень репозитория `pchelper` |
>
> **Связь с курсовой.** Сервис в `infra/backend/` — это МИНИМАЛЬНЫЙ учебный
> сервис для задания 6. Он **не является частью курсовой работы** и никак
> не связан с исходным кодом из `Курсовая работа/Приложение/pchelper/`.
> Полноценный бэкенд магазина реализуется в курсовой.

---

## 1. Быстрый старт

```bash
# Windows (PowerShell)
cd ЛР4\infra
copy .env.example .env
docker compose up -d --build
```

```bash
# Linux / macOS
cd ЛР4/infra
cp .env.example .env
docker compose up -d --build
```

Через 40–90 секунд (первая сборка дольше — скачиваются образы)
все контейнеры переходят в статус **healthy**.

### Что доступно после запуска

| Адрес | Что отвечает |
|-------|--------------|
| <http://localhost:8080> | страница проверки окружения (nginx) |
| <http://localhost:8080/health> | «Hello World» веб-контейнера |
| <http://localhost:3001/api/v1/health> | проверка backend |
| <http://localhost:3001/api/v1/hello> | «Hello World» backend |
| <http://localhost:3001/api/v1/hello/db> | проверка подключения к БД |
| <http://localhost:5432> | PostgreSQL |
| <http://localhost:8081/mcp> | MCP-сервер (профиль `mcp`) |

### Фактическое состояние после запуска

```
NAME                IMAGE                SERVICE    STATUS                    PORTS
pchelper-api        pchelper/api:1.0.0   api        Up (healthy)             0.0.0.0:3001->3001/tcp
pchelper-postgres   postgres:15-alpine   postgres   Up (healthy)             0.0.0.0:5432->5432/tcp
pchelper-redis      redis:7-alpine       redis      Up (healthy)             0.0.0.0:6379->6379/tcp
pchelper-web        pchelper/web:1.0.0   web        Up (healthy)             0.0.0.0:8080->80/tcp
```

---

## 2. Частые команды

```bash
docker compose ps                        # состояние контейнеров
docker compose logs -f api               # логи backend (follow)
docker compose logs --tail=50 postgres  # последние 50 строк лога БД

# Профили: поднимаются только по требованию
docker compose up -d postgres redis              # только инфраструктура
docker compose --profile test run --rm tests     # smoke-тесты в контейнере
docker compose --profile mcp  up -d mcp          # MCP-сервер

# Проверка модели данных: 14 проверок
docker compose exec -T postgres psql -U pchelper -d pchelper \
    -f /docker-entrypoint-initdb.d/06_check.sql

# Остановка
docker compose down       # остановить, тома останутся
docker compose down -v    # остановить и удалить тома с данными
```

---

## 3. Состав каталогов

| Файл | Назначение | Пункт задания |
|------|------------|---------------|
| `docker-compose.yml` | Оркестрация всех сервисов окружения | 8 |
| `backend/Dockerfile` | Многостадийная сборка (deps → dev → prod) | 8 |
| `backend/src/app.js` | Конфигурация Express: middleware, маршруты, обработка ошибок | 9 |
| `backend/src/server.js` | Точка входа, запуск HTTP-сервера | 9 |
| `backend/src/routes/hello.js` | Приложение «Hello World» | 9 |
| `backend/src/routes/admin.js` | Пример защищённого маршрута `/admin` | FR-08 |
| `backend/tests/health.test.js` | Юнит-тесты API (8 тестов, node:test) | 6 |
| `backend/tests/smoke.test.js` | Интеграционные тесты через сеть (5 тестов) | 6 |
| `frontend/Dockerfile` | Статика, отдаваемая nginx | 8 |
| `frontend/nginx.conf` | SPA-fallback, прокси `/api`, заголовки безопасности | 8 |
| `frontend/public/index.html` | Страница проверки окружения | 9 |
| `api/openapi.yaml` | Спецификация API, анализируется SonarQube | 3, 12 |
| `.github/workflows/ci.yml` | Полный CI/CD-конвейер | 6, 10, 11, 12, 13 |
| `sonar-project.properties` | Конфигурация SonarQube | 12 |
| `.env.example` / `.env` | Переменные окружения | 8 |
| `.gitignore` | Что не коммитится | — |

---

## 4. Решения по контейнеризации

| Решение | Обоснование |
|---------|-------------|
| **Многостадийная сборка** (`deps` → `dev` → `prod`) | В production-образ не попадают dev-зависимости; слой `deps` кэшируется между сборками |
| **Запуск от непривилегированного пользователя** | В `prod`-стадии создаётся пользователь `pchelper`, `USER pchelper` — минимизация поверхности атаки |
| **`tini` как entrypoint** | Корректная обработка `SIGTERM` от Docker Compose: контейнер успевает завершить запросы |
| **Healthcheck в каждом образе** | `depends_on: condition: service_healthy` — API стартует только после готовности БД и кэша |
| **Схема БД в `/docker-entrypoint-initdb.d`** | Скрипты из `db/` применяются автоматически при первом запуске `postgres` |
| **Профили `test` и `mcp`** | Обычный запуск поднимает только 4 контейнера; тесты и MCP — по требованию |
| **Переменные окружения в `.env`** | Секреты не попадают в образ и в репозиторий; `.env` в `.gitignore` |
| **Тесты без внешних зависимостей** | Встроенный `node:test` + `fetch`: образ с тестами не тянет vitest и supertest |

---

## 5. Проверка модели данных

После первого запуска выполняется `db/06_check.sql` — скрипт из 14 проверок,
который демонстрирует, что модель работает как задумано:

* единый каталог возвращает все 8 типов компонентов;
* цена готовой конфигурации **вычисляется**, а не хранится;
* правило 7 (запас БП 25 %) считает `ceil((120 + 245) × 1.25) = 457 Вт`;
* несовместимая сборка возвращает три ошибки с кодами;
* **триггер блокирует отмену доставленного и отправленного заказа**;
* CHECK-ограничение не даёт записать два компонента в одну позицию;
* в позиции заказа хранится снимок цены.

Применённая схема: **22 таблицы, 72 индекса, 7 типов-перечислений, 4 триггера.**

---

## 6. Непрерывная интеграция и доставка

Файл `.github/workflows/ci.yml` описывает шесть этапов:

```
pull request → develop
  ├─ 0. lint                 ESLint + Prettier
  ├─ 1. test                unit + integration + покрытие (PostgreSQL, Redis)
  └─ 2. openapi              redocly lint → bundle → генерация Swagger

push → main
  ├─ 3. sonar                SonarQube Quality Gate (wait=true)
  ├─ 4. build-and-push       сборка и публикация образов в GHCR
  └─ 5. deploy               вебхук Render
```

Образ публикуется только при зелёном Quality Gate: job `build-and-push`
объявлен через `needs: [ test, sonar ]`.

### Необходимые секреты репозитория

`Settings → Secrets and variables → Actions`:

| Секрет | Назначение |
|--------|------------|
| `SONAR_TOKEN` | токен SonarCloud / SonarQube |
| `RENDER_DEPLOY_HOOK` | deploy hook веб-сервиса Render |
| `GITHUB_TOKEN` | выдаётся автоматически, публикация в GHCR |

---

## 7. Проверка качества кода SonarQube (пункт 12)

```bash
docker run --rm -it -p 9000:9000 -e SONAR_ES_BOOTSTRAP_CHECKS_DISABLE=true sonarqube:community
```

1. Открыть <http://localhost:9000>, войти как `admin` / `admin` (сменить пароль).
2. Создать проект `pchelper-infra`.
3. *My Account → Security → Generate Token* — скопировать токен.
4. Выполнить анализ:

```bash
docker run --rm --network host \
  -e SONAR_HOST_URL=http://localhost:9000 \
  -e SONAR_TOKEN=<ваш_токен> \
  -v "$(pwd)/backend:/usr/src" \
  sonarsource/sonar-scanner-cli \
  -Dproject.sonarKey=pchelper-infra \
  -Dsonar.sources=src \
  -Dsonar.qualitygate.wait=true
```

---

## 8. Развёртывание на Render (пункт 13)

| Платформа | Что разворачивается | Тариф |
|-----------|---------------------|-------|
| **Render** | Backend из `infra/backend` | Free |
| **Vercel** или локально | Веб-приложение | Free |

1. `render.com` → **New → Web Service** → репозиторий с папкой `infra/backend`.
2. Environment: **Docker**; Context — каталог с Dockerfile.
3. Переменные окружения из `.env.example`.
4. Auto-Deploy: **No**, деплой из CI через Deploy Hook → секрет `RENDER_DEPLOY_HOOK`.

Проверка после деплоя:

```
GET https://<имя-сервиса>.onrender.com/api/v1/health
GET https://<имя-сервиса>.onrender.com/api/v1/hello
```

---

## 9. Известные особенности и грабли

| Проблема | Причина | Решение |
|----------|---------|---------|
| `npm ci` требует `package-lock.json` | Файла не было | `npm install --package-lock-only` |
| MCP-сервер падает с `ModuleNotFoundError: mcp.server.fastmcp` | Установился `mcp` 2.x, где `FastMCP` переименован в `MCPServer` | В `mcp/requirements.txt` зафиксировано `mcp>=1.2.0,<2.0` |
| Dockerfile не найден при сборке образа MCP | Файл лежал вне контекста сборки | `Dockerfile` перемещён в каталог `mcp/` |
| `syntax error at or near "="` в CHECK-ограничении | Закрывающая скобка `CHECK (` стояла до `= 1` | Оператор `= 1` перенесён внутрь скобок |
| `format('... ix_%I_name_trgm ...')` ломает имена индексов | Спецификатор `%I` сам добавляет кавычки | Имя индекса собирается склейкой и передаётся отдельным аргументом |
| `unterminated quoted string` в PL/pgSQL | Вложенное удвоение кавычек внутри `$$…$$` | Внутренний SQL заключён в отдельный `$q$…$q$` |
| Postgres не проходит healthcheck | Ошибка в скрипте инициализации прерывала `psql` | Смотрите `docker logs pchelper-postgres` |

---

## 10. Публикация в GitHub

Материалы этой папки загружаются в личный репозиторий, созданный
для задания 6:

    https://github.com/AlekseiNarkevich/pchelper-infra

Соответствие один к одному:

| Из папки `ЛР4/infra/` | Куда в репозитории |
|-----------------------|--------------------|
| `docker-compose.yml` | корень |
| `backend/` | `/backend` |
| `frontend/` | `/frontend` |
| `api/openapi.yaml` | `/api` |
| `.github/workflows/ci.yml` | `/.github/workflows` |
| `sonar-project.properties` | корень |
| `.env.example` | корень |

Не загружаются: `node_modules/`, `.env`, `.env.local`, `*.db`,
`__pycache__/`, каталог `mcp/` из ЛР4 (он подключается отдельно).

**Порядок действий** (важно для честных скриншотов):

1. Создать репозиторий и **сразу** включить защиту ветки `main`:
   *Settings → Branches → Add rule* — требуется Pull request
   и статус проверок. Пустая ветка — единственный момент, когда
   это можно сделать без препятствий.
2. Скопировать содержимое `ЛР4/infra/` в корень клона.
3. Первый коммит: `feat(infra): конфигурация окружения ЛР4 (п. 8)`.
4. Дальше коммитить по ходу, а не одним заходом: отчёт требует
   скриншоты реальных запусков конвейера, и по одному коммиту
   преподаватель поймёт, что CI действительно работал.

```bash
git clone https://github.com/AlekseiNarkevich/pchelper-infra.git
cd pchelper-infra
# скопировать сюда содержимое ЛР4/infra/
git add .
git commit -m "feat(infra): конфигурация окружения ЛР4 (п. 8)"
git push -u origin main
```

---

## 11. Требования к рабочему месту

* Docker Engine 24+ и Docker Compose v2;
* 4 ГБ свободной памяти для всех сервисов одновременно;
* Node.js 20 и npm 10 — для запуска без Docker;
* Python 3.12 — для MCP-сервера.

Проверено на: Docker 29.8.2, Docker Compose v5.6.0, Docker Desktop (Windows),
Node.js 22.23.3, Python 3.14.8.