-- =====================================================================
--  PCHelper — физическая модель данных (PostgreSQL 15 / Supabase)
--  Лабораторная работа № 4, задание 2
--
--  Структура проекта:
--    db/01_schema.sql                 — расширения, ENUM-типы, таблицы каталога
--    db/02_marketplace.sql            — пользователи, корзины, заказы, сборки, отзывы
--    db/03_indexes_constraints.sql    — индексы, CHECK, триггеры, статусная машина
--    db/04_views.sql                  — представления для API
--    db/05_seed.sql                   — демонстрационные данные
--
--  Порядок применения:  01 → 02 → 03 → 04 → 05
--  Применение:          psql -U postgres -d pchelper -f db/01_schema.sql
--                      либо в Supabase SQL Editor
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 0. Расширения и доменные ENUM-типы
-- ---------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS citext;      -- регистронезависимый e-mail
CREATE EXTENSION IF NOT EXISTS pgcrypto;    -- gen_random_uuid(), crypt()

-- Тип компонента: единый перечислитель для корзины, заказа, отзывов, остатков
DO $$ BEGIN
    CREATE TYPE component_type AS ENUM (
        'cpu', 'motherboard', 'ram', 'cooling',
        'gpu', 'storage', 'psu', 'case'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Роль пользователя
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('guest', 'customer', 'manager');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Статус заказа (жизненный цикл: Новый → В обработке → Собран → Отправлен → Доставлен)
DO $$ BEGIN
    CREATE TYPE order_status AS ENUM (
        'Новый', 'В обработке', 'Собран', 'Отправлен', 'Доставлен', 'Отменён'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Способ доставки
DO $$ BEGIN
    CREATE TYPE delivery_method AS ENUM ('courier', 'pickup', 'mail');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Способ оплаты
DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('card', 'cash', 'installment', 'credit');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Тип скидки по промокоду
DO $$ BEGIN
    CREATE TYPE discount_type AS ENUM ('percent', 'fixed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Статус модерации отзыва
DO $$ BEGIN
    CREATE TYPE review_status AS ENUM ('на модерации', 'опубликован', 'отклонён');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =====================================================================
-- 1. КАТАЛОГ КОМПЛЕКТУЮЩИХ (8 специализированных таблиц)
--    Существующая модель проекта, уточнённая типами и ограничениями.
--    JSONB-поля: ядра_потоки, частота, скорость_чтения_записи
-- =====================================================================

CREATE TABLE IF NOT EXISTS "Процессоры" (
    id                    SERIAL PRIMARY KEY,
    название              VARCHAR(255) NOT NULL,
    производитель         VARCHAR(50),
    сокет                 VARCHAR(50)  NOT NULL,
    ядра_потоки           JSONB        NOT NULL DEFAULT '{"cores":0,"threads":0}'::jsonb,
    частота               JSONB        NOT NULL DEFAULT '{"base":0,"boost":0}'::jsonb,
    tdp                   INTEGER      NOT NULL CHECK (tdp BETWEEN 1 AND 1000),
    встроенная_графика    VARCHAR(100),
    поддержка_памяти      VARCHAR(50),
    цена                  INTEGER      NOT NULL CHECK (цена >= 0),
    фото_url              TEXT,
    создан_в              TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_cpu_cores  CHECK (ядра_потоки ? 'cores' AND ядра_потоки ? 'threads'),
    CONSTRAINT chk_cpu_freq   CHECK (частота ? 'base'  AND частота ? 'boost')
);

CREATE TABLE IF NOT EXISTS "МатеринскиеПлаты" (
    id                SERIAL PRIMARY KEY,
    название          VARCHAR(255) NOT NULL,
    сокет             VARCHAR(50)  NOT NULL,
    тип_памяти        VARCHAR(50)  NOT NULL CHECK (тип_памяти IN ('DDR3','DDR4','DDR5')),
    форм_фактор       VARCHAR(50)  NOT NULL CHECK (форм_фактор IN ('Mini-ITX','Micro-ATX','ATX','E-ATX')),
    чипсет            VARCHAR(50),
    фазы_питания      VARCHAR(50),
    макс_объем_памяти INTEGER      CHECK (макс_объем_памяти > 0),
    m2_слоты          INTEGER      CHECK (m2_слоты     >= 0),
    sata_порты        INTEGER      CHECK (sata_порты   >= 0),
    цена              INTEGER      NOT NULL CHECK (цена >= 0),
    фото_url          TEXT,
    создан_в          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "ОЗУ" (
    id              SERIAL PRIMARY KEY,
    название        VARCHAR(255) NOT NULL,
    объем           INTEGER      NOT NULL CHECK (объем > 0),
    частота         INTEGER      CHECK (частота > 0),
    тип             VARCHAR(50)  NOT NULL CHECK (тип IN ('DDR3','DDR4','DDR5')),
    профили_разгона BOOLEAN      NOT NULL DEFAULT false,
    тайминги        VARCHAR(50),
    цена            INTEGER      NOT NULL CHECK (цена >= 0),
    фото_url        TEXT,
    создан_в        TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "СистемыОхлаждения" (
    id                 SERIAL PRIMARY KEY,
    название           VARCHAR(255) NOT NULL,
    тип                VARCHAR(50)  NOT NULL CHECK (тип IN ('Воздушное','Жидкостное')),
    tdp                INTEGER      NOT NULL CHECK (tdp > 0),
    высота             INTEGER      CHECK (высота > 0),
    длина_радиатора    INTEGER      CHECK (длина_радиатора > 0),
    шум_макс           INTEGER      CHECK (шум_макс >= 0),
    цена               INTEGER      NOT NULL CHECK (цена >= 0),
    фото_url           TEXT,
    создан_в           TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Видеокарты" (
    id                       SERIAL PRIMARY KEY,
    название                 VARCHAR(255) NOT NULL,
    производитель            VARCHAR(50),
    объем_памяти             INTEGER      CHECK (объем_памяти > 0),
    длина                    INTEGER      NOT NULL CHECK (длина > 0),
    tdp                      INTEGER      NOT NULL DEFAULT 0 CHECK (tdp >= 0),
    количество_вентиляторов   INTEGER      CHECK (количество_вентиляторов >= 0),
    толщина_в_слотах         NUMERIC(2,1) CHECK (толщина_в_слотах > 0),
    цена                     INTEGER      NOT NULL CHECK (цена >= 0),
    фото_url                 TEXT,
    создан_в                 TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Накопители" (
    id                       SERIAL PRIMARY KEY,
    название                 VARCHAR(255) NOT NULL,
    объем_в_гб               INTEGER      NOT NULL CHECK (объем_в_гб > 0),
    скорость_чтения_записи   JSONB        NOT NULL DEFAULT '{"read":0,"write":0}'::jsonb,
    драм_буфер               BOOLEAN      NOT NULL DEFAULT false,
    радиатор_охлаждения      BOOLEAN      NOT NULL DEFAULT false,
    тип                      VARCHAR(50)  NOT NULL CHECK (тип IN ('SSD','HDD')),
    интерфейс                VARCHAR(50)  NOT NULL CHECK (интерфейс IN ('M.2','SATA')),
    цена                     INTEGER      NOT NULL CHECK (цена >= 0),
    фото_url                 TEXT,
    создан_в                 TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_stg_speed CHECK (скорость_чтения_записи ? 'read' AND скорость_чтения_записи ? 'write')
);

CREATE TABLE IF NOT EXISTS "БлокиПитания" (
    id                       SERIAL PRIMARY KEY,
    название                 VARCHAR(255) NOT NULL,
    мощность_в_ваттах       INTEGER      NOT NULL CHECK (мощность_в_ваттах > 0),
    pcie_gen5                BOOLEAN      NOT NULL DEFAULT false,
    количество_pcie          INTEGER      DEFAULT 0,
    количество_cpu           INTEGER      DEFAULT 0,
    количество_sata          INTEGER      DEFAULT 0,
    стандарт_блока_питания   VARCHAR(50),
    сертификат_80plus        VARCHAR(50),
    сертификат_cybenetics    VARCHAR(50),
    модульный                BOOLEAN      NOT NULL DEFAULT false,
    цена                     INTEGER      NOT NULL CHECK (цена >= 0),
    фото_url                 TEXT,
    создан_в                 TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "Корпуса" (
    id                       SERIAL PRIMARY KEY,
    название                 VARCHAR(255) NOT NULL,
    форм_фактор              VARCHAR(50),
    макс_длина_gpu           INTEGER      CHECK (макс_длина_gpu >= 0),
    макс_высота_кулера       INTEGER      CHECK (макс_высота_кулера >= 0),
    поддержка_сжо            BOOLEAN      NOT NULL DEFAULT false,
    макс_длина_радиатора     INTEGER      CHECK (макс_длина_радиатора >= 0),
    вентиляторы_в_комплекте  VARCHAR(255),
    цена                     INTEGER      NOT NULL CHECK (цена >= 0),
    фото_url                 TEXT,
    создан_в                 TIMESTAMPTZ  NOT NULL DEFAULT now()
);


-- =====================================================================
-- 2. ГОТОВЫЕ КОНФИГУРАЦИИ
-- =====================================================================

CREATE TABLE IF NOT EXISTS "ГотовыеКонфигурации" (
    id                  SERIAL PRIMARY KEY,
    процессор_id        INTEGER NOT NULL REFERENCES "Процессоры"(id)        ON DELETE RESTRICT,
    материнская_плата_id INTEGER NOT NULL REFERENCES "МатеринскиеПлаты"(id)   ON DELETE RESTRICT,
    озу_id               INTEGER NOT NULL REFERENCES "ОЗУ"(id)                ON DELETE RESTRICT,
    видеокарта_id        INTEGER          REFERENCES "Видеокарты"(id)          ON DELETE SET NULL,
    блокпитания_id       INTEGER NOT NULL REFERENCES "БлокиПитания"(id)        ON DELETE RESTRICT,
    корпус_id            INTEGER NOT NULL REFERENCES "Корпуса"(id)            ON DELETE RESTRICT,
    охлаждение_id        INTEGER NOT NULL REFERENCES "СистемыОхлаждения"(id)  ON DELETE RESTRICT,
    название             VARCHAR(255) NOT NULL,
    задачи               VARCHAR(255),
    фото_url             TEXT,
    создан_в             TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "КонфигурацияНакопители" (
    id               SERIAL PRIMARY KEY,
    конфигурация_id  INTEGER NOT NULL REFERENCES "ГотовыеКонфигурации"(id) ON DELETE CASCADE,
    накопитель_id    INTEGER NOT NULL REFERENCES "Накопители"(id)           ON DELETE RESTRICT,
    CONSTRAINT uq_cfg_storage UNIQUE (конфигурация_id, накопитель_id)
);

COMMIT;