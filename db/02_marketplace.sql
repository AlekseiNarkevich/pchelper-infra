-- =====================================================================
--  PCHelper — рыночная часть схемы (задание 2)
--  Пользователи, токены, остатки, корзины, заказы, промокоды,
--  сохранённые сборки, отзывы, журнал действий агента.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 3. ПОЛЬЗОВАТЕЛИ И АУТЕНТИФИКАЦИЯ
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Пользователи" (
    id             SERIAL PRIMARY KEY,
    email          CITEXT       NOT NULL,
    password_hash  VARCHAR(255),                          -- NULL для входа через внешний IdP
    имя            VARCHAR(100) NOT NULL,
    телефон        VARCHAR(30),
    роль           user_role    NOT NULL DEFAULT 'customer',
    создан_в       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    обновлён_в     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_users_email UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS "ОбновительныеТокены" (
    id               SERIAL PRIMARY KEY,
    пользователь_id  INTEGER      NOT NULL REFERENCES "Пользователи"(id) ON DELETE CASCADE,
    token_hash       VARCHAR(128) NOT NULL,
    истекает_в       TIMESTAMPTZ  NOT NULL,
    отозван          BOOLEAN      NOT NULL DEFAULT false,
    создан_в         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_refresh_token UNIQUE (token_hash)
);

-- ---------------------------------------------------------------------
-- 4. СКЛАДСКИЕ ОСТАТКИ
--    Первичный ключ составной (тип, идентификатор) — единая таблица
--    для 8 разнородных каталогов без наследования и полиморфизма.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Наличие" (
    тип_компонента    component_type NOT NULL,
    идентификатор     INTEGER        NOT NULL,
    количество         INTEGER        NOT NULL DEFAULT 0 CHECK (количество >= 0),
    зарезервировано   INTEGER        NOT NULL DEFAULT 0 CHECK (зарезервировано >= 0),
    порог_малого      INTEGER        NOT NULL DEFAULT 3 CHECK (порог_малого >= 0),
    обновлено          TIMESTAMPTZ    NOT NULL DEFAULT now(),
    PRIMARY KEY (тип_компонента, идентификатор),
    CONSTRAINT chk_reserved_le_total CHECK (зарезервировано <= количество)
);

-- ---------------------------------------------------------------------
-- 5. СОХРАНЁННЫЕ СБОРКИ ПОЛЬЗОВАТЕЛЯ
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Сборки" (
    id               SERIAL PRIMARY KEY,
    пользователь_id  INTEGER      NOT NULL REFERENCES "Пользователи"(id) ON DELETE CASCADE,
    название         VARCHAR(150) NOT NULL,
    общая_стоимость  INTEGER      NOT NULL DEFAULT 0 CHECK (общая_стоимость >= 0),
    заметка          TEXT,
    создан_в         TIMESTAMPTZ  NOT NULL DEFAULT now(),
    обновлён_в       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Состав сборки: ровно одна из восьми ссылок заполнена (проверяется CHECK в 03_…sql).
-- Такой же приём применён в проекте для «ГотовыеКонфигурации» —
-- он гарантирует ссылочную целостность и не требует 8 связочных таблиц.
CREATE TABLE IF NOT EXISTS "Сборка_Компоненты" (
    id                   SERIAL PRIMARY KEY,
    сборка_id            INTEGER NOT NULL REFERENCES "Сборки"(id) ON DELETE CASCADE,
    количество           INTEGER NOT NULL DEFAULT 1 CHECK (количество > 0),
    процессор_id         INTEGER REFERENCES "Процессоры"(id)       ON DELETE CASCADE,
    материнская_плата_id INTEGER REFERENCES "МатеринскиеПлаты"(id)  ON DELETE CASCADE,
    озу_id               INTEGER REFERENCES "ОЗУ"(id)               ON DELETE CASCADE,
    видеокарта_id        INTEGER REFERENCES "Видеокарты"(id)         ON DELETE CASCADE,
    охлаждение_id        INTEGER REFERENCES "СистемыОхлаждения"(id) ON DELETE CASCADE,
    накопитель_id        INTEGER REFERENCES "Накопители"(id)         ON DELETE CASCADE,
    блокпитания_id       INTEGER REFERENCES "БлокиПитания"(id)       ON DELETE CASCADE,
    корпус_id            INTEGER REFERENCES "Корпуса"(id)           ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- 6. КОРЗИНА
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Корзины" (
    id               SERIAL PRIMARY KEY,
    пользователь_id  INTEGER     NOT NULL REFERENCES "Пользователи"(id) ON DELETE CASCADE,
    обновлена        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_cart_user UNIQUE (пользователь_id)   -- одна активная корзина
);

CREATE TABLE IF NOT EXISTS "Корзина_Позиции" (
    id                   SERIAL PRIMARY KEY,
    корзина_id           INTEGER NOT NULL REFERENCES "Корзины"(id) ON DELETE CASCADE,
    количество           INTEGER NOT NULL DEFAULT 1 CHECK (количество BETWEEN 1 AND 10),
    цена                 INTEGER NOT NULL CHECK (цена >= 0),   -- снимок на момент добавления
    процессор_id         INTEGER REFERENCES "Процессоры"(id)       ON DELETE CASCADE,
    материнская_плата_id INTEGER REFERENCES "МатеринскиеПлаты"(id)  ON DELETE CASCADE,
    озу_id               INTEGER REFERENCES "ОЗУ"(id)               ON DELETE CASCADE,
    видеокарта_id        INTEGER REFERENCES "Видеокарты"(id)         ON DELETE CASCADE,
    охлаждение_id        INTEGER REFERENCES "СистемыОхлаждения"(id) ON DELETE CASCADE,
    накопитель_id        INTEGER REFERENCES "Накопители"(id)         ON DELETE CASCADE,
    блокпитания_id       INTEGER REFERENCES "БлокиПитания"(id)       ON DELETE CASCADE,
    корпус_id            INTEGER REFERENCES "Корпуса"(id)           ON DELETE CASCADE,
    добавлен_в           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 7. ПРОМОКОДЫ
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Промокоды" (
    id             SERIAL PRIMARY KEY,
    код            VARCHAR(30)     NOT NULL,
    тип_скидки     discount_type   NOT NULL,
    значение       INTEGER         NOT NULL CHECK (значение > 0),
    мин_сумма      INTEGER         NOT NULL DEFAULT 0 CHECK (мин_сумма >= 0),
    действует_с    DATE            NOT NULL DEFAULT CURRENT_DATE,
    действует_по   DATE            NOT NULL DEFAULT (CURRENT_DATE + 30),
    активен        BOOLEAN         NOT NULL DEFAULT true,
    макс_применений INTEGER        NOT NULL DEFAULT 1000 CHECK (макс_применений > 0),
    применено      INTEGER         NOT NULL DEFAULT 0,
    CONSTRAINT uq_promo_code UNIQUE (код),
    CONSTRAINT chk_promo_dates CHECK (действует_по >= действует_с),
    CONSTRAINT chk_promo_usage CHECK (применено < макс_применений)
);

-- ---------------------------------------------------------------------
-- 8. ЗАКАЗЫ
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Заказы" (
    id                 SERIAL PRIMARY KEY,
    номер              VARCHAR(20)    NOT NULL,                    -- PCH-2026-000001
    пользователь_id    INTEGER        NOT NULL REFERENCES "Пользователи"(id) ON DELETE RESTRICT,
    статус             order_status   NOT NULL DEFAULT 'Новый',
    способ_доставки    delivery_method NOT NULL,
    адрес_доставки     TEXT,
    телефон            VARCHAR(30)    NOT NULL,
    способ_оплаты      payment_method NOT NULL,
    итоговая_сумма     INTEGER        NOT NULL CHECK (итоговая_сумма >= 0),
    скидка             INTEGER        NOT NULL DEFAULT 0 CHECK (скидка >= 0),
    промокод_id        INTEGER        REFERENCES "Промокоды"(id)   ON DELETE SET NULL,
    трек_номер         VARCHAR(40),                               -- заполняется при «Отправлен»
    комментарий_менеджера TEXT,
    создан_в           TIMESTAMPTZ    NOT NULL DEFAULT now(),
    обновлён_в         TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT uq_order_number UNIQUE (номер),
    CONSTRAINT chk_address_required
        CHECK (способ_доставки = 'pickup' OR адрес_доставки IS NOT NULL)
);

-- Позиция заказа — ИММУТАБЕЛЬНЫЙ СНИМОК: хранит название и цену,
-- зафиксированные в момент оформления. Изменение цены в каталоге
-- не влияет на историю заказов.
CREATE TABLE IF NOT EXISTS "Заказ_Позиции" (
    id                  SERIAL PRIMARY KEY,
    заказ_id            INTEGER        NOT NULL REFERENCES "Заказы"(id) ON DELETE CASCADE,
    тип_компонента      component_type NOT NULL,
    идентификатор       INTEGER        NOT NULL,                    -- id в соответствующей таблице
    название            VARCHAR(255)   NOT NULL,                    -- снимок
    цена_за_единицу     INTEGER        NOT NULL CHECK (цена_за_единицу >= 0),  -- снимок
    количество          INTEGER        NOT NULL CHECK (количество BETWEEN 1 AND 10),
    сумма               INTEGER        NOT NULL CHECK (сумма >= 0)  -- = цена × количество
);

-- ---------------------------------------------------------------------
-- 9. ОТЗЫВЫ
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Отзывы" (
    id                 SERIAL PRIMARY KEY,
    пользователь_id    INTEGER        NOT NULL REFERENCES "Пользователи"(id) ON DELETE CASCADE,
    тип_компонента     component_type NOT NULL,
    идентификатор      INTEGER        NOT NULL,
    оценка             SMALLINT       NOT NULL CHECK (оценка BETWEEN 1 AND 5),
    текст              TEXT,
    статус_модерации   review_status  NOT NULL DEFAULT 'на модерации',
    создан_в           TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT uq_review_author_item
        UNIQUE (пользователь_id, тип_компонента, идентификатор)
);

-- ---------------------------------------------------------------------
-- 10. ЖУРНАЛ ДЕЙСТВИЙ АГЕНТА (MCP)
--     Требование задания 5: аудит действий агента, в том числе
--     при работе с персональными данными пользователей.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ЖурналДействийАгента" (
    id             BIGSERIAL PRIMARY KEY,
    момент         TIMESTAMPTZ NOT NULL DEFAULT now(),
    агент          VARCHAR(100) NOT NULL,          -- идентификатор LLM-клиента / сессии
    инструмент     VARCHAR(100) NOT NULL,
    пользователь_id INTEGER     REFERENCES "Пользователи"(id) ON DELETE SET NULL,
    аргументы      JSONB       NOT NULL DEFAULT '{}'::jsonb,  -- PII маскировано
    результат      VARCHAR(1000),
    код_ответа     INTEGER,
    успешно        BOOLEAN     NOT NULL DEFAULT true,
    длительность_мс INTEGER
);

COMMIT;