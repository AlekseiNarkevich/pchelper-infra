-- =====================================================================
--  PCHelper MCP-сервер — схема mock-базы (SQLite)
--  Названия таблиц и столбцов совпадают с физической моделью
--  PostgreSQL (db/01_schema.sql … db/02_marketplace.sql):
--  сервер работает с теми же сущностями, что и REST-API.
-- =====================================================================

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------
-- Каталог (сокращённый набор колонок, достаточный для проверки совместимости)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Процессоры" (
    id             INTEGER PRIMARY KEY,
    название       TEXT NOT NULL,
    производитель  TEXT,
    сокет          TEXT NOT NULL,
    ядра_потоки    TEXT,          -- {"cores":8,"threads":16}
    частота        TEXT,          -- {"base":3.2,"boost":4.4}
    tdp            INTEGER NOT NULL,
    цена           INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS "МатеринскиеПлаты" (
    id            INTEGER PRIMARY KEY,
    название      TEXT NOT NULL,
    сокет         TEXT NOT NULL,
    тип_памяти    TEXT NOT NULL,
    форм_фактор   TEXT NOT NULL,
    цена          INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "ОЗУ" (
    id       INTEGER PRIMARY KEY,
    название TEXT NOT NULL,
    объем    INTEGER NOT NULL,
    частота  INTEGER,
    тип      TEXT NOT NULL,
    цена     INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "СистемыОхлаждения" (
    id              INTEGER PRIMARY KEY,
    название        TEXT NOT NULL,
    тип             TEXT NOT NULL,      -- Воздушное | Жидкостное
    tdp             INTEGER NOT NULL,
    высота          INTEGER,
    длина_радиатора INTEGER,
    цена            INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "Видеокарты" (
    id            INTEGER PRIMARY KEY,
    название      TEXT NOT NULL,
    производитель TEXT,
    длина         INTEGER NOT NULL,
    tdp           INTEGER NOT NULL DEFAULT 0,
    цена          INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS "Накопители" (
    id        INTEGER PRIMARY KEY,
    название  TEXT NOT NULL,
    объем_в_гб INTEGER NOT NULL,
    тип       TEXT NOT NULL,            -- SSD | HDD
    интерфейс TEXT NOT NULL,
    цена      INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS "БлокиПитания" (
    id                  INTEGER PRIMARY KEY,
    название            TEXT NOT NULL,
    мощность_в_ваттах   INTEGER NOT NULL,
    цена                INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS "Корпуса" (
    id                     INTEGER PRIMARY KEY,
    название               TEXT NOT NULL,
    форм_фактор            TEXT NOT NULL,
    макс_длина_gpu         INTEGER NOT NULL,
    макс_высота_кулера     INTEGER NOT NULL,
    макс_длина_радиатора   INTEGER,
    цена                   INTEGER NOT NULL
);

-- ---------------------------------------------------------------------
-- Пользователи, остатки, корзина, заказы
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Пользователи" (
    id       INTEGER PRIMARY KEY,
    имя      TEXT NOT NULL,
    email    TEXT UNIQUE NOT NULL,
    роль     TEXT NOT NULL DEFAULT 'customer'   -- customer | manager
);

CREATE TABLE IF NOT EXISTS "Наличие" (
    тип_компонента TEXT NOT NULL,                -- cpu | motherboard | …
    идентификатор  INTEGER NOT NULL,
    количество      INTEGER NOT NULL DEFAULT 0,
    зарезервировано INTEGER NOT NULL DEFAULT 0,
    обновлено       TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (тип_компонента, идентификатор)
);

CREATE TABLE IF NOT EXISTS "Корзины" (
    id              INTEGER PRIMARY KEY,
    пользователь_id INTEGER NOT NULL REFERENCES "Пользователи"(id),
    обновлена       TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (пользователь_id)
);

CREATE TABLE IF NOT EXISTS "Корзина_Позиции" (
    id            INTEGER PRIMARY KEY,
    корзина_id    INTEGER NOT NULL REFERENCES "Корзины"(id) ON DELETE CASCADE,
    тип_компонента TEXT NOT NULL,
    идентификатор  INTEGER NOT NULL,
    количество     INTEGER NOT NULL DEFAULT 1 CHECK (количество BETWEEN 1 AND 10),
    цена           INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS "Промокоды" (
    код        TEXT PRIMARY KEY,
    тип_скидки TEXT NOT NULL,            -- percent | fixed
    значение   INTEGER NOT NULL,
    мин_сумма  INTEGER NOT NULL DEFAULT 0,
    макс_применений INTEGER NOT NULL DEFAULT 1000,
    применено  INTEGER NOT NULL DEFAULT 0,
    активен    INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "Заказы" (
    id               INTEGER PRIMARY KEY,
    номер            TEXT UNIQUE NOT NULL,
    пользователь_id  INTEGER NOT NULL REFERENCES "Пользователи"(id),
    статус           TEXT NOT NULL DEFAULT 'Новый',
    способ_доставки  TEXT NOT NULL,
    адрес_доставки   TEXT,
    телефон          TEXT NOT NULL,
    способ_оплаты    TEXT NOT NULL,
    скидка           INTEGER NOT NULL DEFAULT 0,
    итоговая_сумма   INTEGER NOT NULL,
    промокод         TEXT,
    трек_номер       TEXT,
    комментарий_менеджера TEXT,
    создан_в         TEXT NOT NULL DEFAULT (datetime('now')),
    обновлён_в       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "Заказ_Позиции" (
    id               INTEGER PRIMARY KEY,
    заказ_id         INTEGER NOT NULL REFERENCES "Заказы"(id) ON DELETE CASCADE,
    тип_компонента   TEXT NOT NULL,
    идентификатор    INTEGER NOT NULL,
    название         TEXT NOT NULL,
    цена_за_единицу  INTEGER NOT NULL,
    количество        INTEGER NOT NULL,
    сумма             INTEGER NOT NULL
);

-- ---------------------------------------------------------------------
-- Справочник разрешённых переходов статусов заказа.
-- Дублирует таблицу «ПереходыСтатусовЗаказа» из PostgreSQL-модели,
-- чтобы бизнес-правило было единым для REST-API и MCP-сервера.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ПереходыСтатусовЗаказа" (
    из_status   TEXT NOT NULL,
    в_status    TEXT NOT NULL,
    роль_кто    TEXT NOT NULL,
    PRIMARY KEY (из_status, в_status)
);

-- ---------------------------------------------------------------------
-- Журнал действий агента (требование задания 5 к логированию)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ЖурналДействийАгента" (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    момент       TEXT NOT NULL DEFAULT (datetime('now')),
    агент        TEXT NOT NULL,
    инструмент   TEXT NOT NULL,
    аргументы    TEXT NOT NULL DEFAULT '{}',
    результат    TEXT,
    код_ответа   INTEGER,
    успешно      INTEGER NOT NULL DEFAULT 1,
    длительность_мс INTEGER
);

CREATE INDEX IF NOT EXISTS ix_заказы_пользователь ON "Заказы"(пользователь_id);
CREATE INDEX IF NOT EXISTS ix_заказы_статус        ON "Заказы"(статус);
CREATE INDEX IF NOT EXISTS ix_позиции_заказа       ON "Заказ_Позиции"(заказ_id);
CREATE INDEX IF NOT EXISTS ix_корзина_позиции      ON "Корзина_Позиции"(корзина_id);