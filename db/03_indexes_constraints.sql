-- =====================================================================
--  PCHelper — индексы, ограничения, триггеры, статусная машина заказа
--  (db/03_indexes_constraints.sql)
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 10.1 Расширения для полнотекстового (fuzzy) поиска
--      Устанавливаются ДО индексов, которые используют gin_trgm_ops.
-- ---------------------------------------------------------------------
DO $$ BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_trgm недоступен — полнотекстовый поиск будет отключён';
END $$;

-- ---------------------------------------------------------------------
-- 11. Индексы каталога
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS ix_cpu_socket        ON "Процессоры"(сокет);
CREATE INDEX IF NOT EXISTS ix_cpu_price         ON "Процессоры"(цена);
CREATE INDEX IF NOT EXISTS ix_cpu_brand         ON "Процессоры"(производитель);
CREATE INDEX IF NOT EXISTS ix_cpu_tdp           ON "Процессоры"(tdp);

CREATE INDEX IF NOT EXISTS ix_mobo_socket       ON "МатеринскиеПлаты"(сокет);
CREATE INDEX IF NOT EXISTS ix_mobo_memtype      ON "МатеринскиеПлаты"(тип_памяти);
CREATE INDEX IF NOT EXISTS ix_mobo_form         ON "МатеринскиеПлаты"(форм_фактор);

CREATE INDEX IF NOT EXISTS ix_ram_type          ON "ОЗУ"(тип);
CREATE INDEX IF NOT EXISTS ix_ram_capacity      ON "ОЗУ"(объем);

CREATE INDEX IF NOT EXISTS ix_cool_tdp          ON "СистемыОхлаждения"(tdp);
CREATE INDEX IF NOT EXISTS ix_cool_type         ON "СистемыОхлаждения"(тип);

CREATE INDEX IF NOT EXISTS ix_gpu_price         ON "Видеокарты"(цена);
CREATE INDEX IF NOT EXISTS ix_gpu_length        ON "Видеокарты"(длина);
CREATE INDEX IF NOT EXISTS ix_gpu_tdp           ON "Видеокарты"(tdp);

CREATE INDEX IF NOT EXISTS ix_stg_type          ON "Накопители"(тип);
CREATE INDEX IF NOT EXISTS ix_stg_price         ON "Накопители"(цена);

CREATE INDEX IF NOT EXISTS ix_psu_watts         ON "БлокиПитания"(мощность_в_ваттах);
CREATE INDEX IF NOT EXISTS ix_case_form         ON "Корпуса"(форм_фактор);
CREATE INDEX IF NOT EXISTS ix_case_max_gpu      ON "Корпуса"(макс_длина_gpu);

-- ---------------------------------------------------------------------
-- 12. Индексы рыночной части
-- ---------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS ix_users_role        ON "Пользователи"(роль);
CREATE INDEX IF NOT EXISTS ix_refresh_user     ON "ОбновительныеТокены"(пользователь_id);
CREATE INDEX IF NOT EXISTS ix_refresh_expired  ON "ОбновительныеТокены"(истекает_в) WHERE отозван = false;

CREATE INDEX IF NOT EXISTS ix_stock_low         ON "Наличие"(тип_компонента, количество);
CREATE INDEX IF NOT EXISTS ix_stock_updated    ON "Наличие"(обновлено DESC);

CREATE INDEX IF NOT EXISTS ix_builds_user      ON "Сборки"(пользователь_id, обновлён_в DESC);
CREATE INDEX IF NOT EXISTS ix_build_items      ON "Сборка_Компоненты"(сборка_id);

CREATE INDEX IF NOT EXISTS ix_cart_items       ON "Корзина_Позиции"(корзина_id);

CREATE INDEX IF NOT EXISTS ix_orders_user      ON "Заказы"(пользователь_id, создан_в DESC);
CREATE INDEX IF NOT EXISTS ix_orders_status    ON "Заказы"(статус, создан_в DESC);
CREATE INDEX IF NOT EXISTS ix_orders_created   ON "Заказы"(создан_в DESC);
CREATE INDEX IF NOT EXISTS ix_order_items      ON "Заказ_Позиции"(заказ_id);

CREATE INDEX IF NOT EXISTS ix_reviews_item     ON "Отзывы"(тип_компонента, идентификатор)
    WHERE статус_модерации = 'опубликован';

CREATE INDEX IF NOT EXISTS ix_audit_time       ON "ЖурналДействийАгента"(момент DESC);
CREATE INDEX IF NOT EXISTS ix_audit_tool       ON "ЖурналДействийАгента"(инструмент);

-- Полнотекстовый поиск по названиям товаров
DO $$
DECLARE tbl text;
BEGIN
    FOREACH tbl IN ARRAY ARRAY['Процессоры','МатеринскиеПлаты','ОЗУ',
                               'Видеокарты','Накопители','БлокиПитания',
                               'Корпуса','СистемыОхлаждения']
    LOOP
        BEGIN
            -- ВАЖНО: спецификатор %I САМ ставит кавычки вокруг идентификатора,
            -- поэтому вставлять его внутрь имени индекса нельзя:
            -- получилось бы ix_"Процессоры"_name_trgm — синтаксическая ошибка.
            -- Имя индекса собираем склейкой и передаём одним аргументом %I.
            EXECUTE format(
                'CREATE INDEX IF NOT EXISTS %I ON %I USING gin (название gin_trgm_ops)',
                'ix_' || tbl || '_name_trgm', tbl);
        EXCEPTION WHEN others THEN
            RAISE NOTICE 'Индекс для % пропущен: %', tbl, SQLERRM;
        END;
    END LOOP;
END $$;


-- ---------------------------------------------------------------------
-- 13. CHECK-ограничения «ровно одна ссылка на компонент»
--     Применяется к Сборка_Компоненты и Корзина_Позиции.
--     Складываем восемь выражений CASE (каждое даёт 1 или 0) и требуем,
--     чтобы сумма была ровно 1 — то есть заполнено ровно одно поле-ссылка.
-- ---------------------------------------------------------------------
ALTER TABLE "Сборка_Компоненты" DROP CONSTRAINT IF EXISTS chk_single_component;
ALTER TABLE "Сборка_Компоненты" ADD CONSTRAINT chk_single_component CHECK (
    (CASE WHEN процессор_id         IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN материнская_плата_id IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN озу_id               IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN видеокарта_id        IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN охлаждение_id        IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN накопитель_id        IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN блокпитания_id       IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN корпус_id            IS NOT NULL THEN 1 ELSE 0 END)
    = 1
);

ALTER TABLE "Корзина_Позиции" DROP CONSTRAINT IF EXISTS chk_single_cart_component;
ALTER TABLE "Корзина_Позиции" ADD CONSTRAINT chk_single_cart_component CHECK (
    (CASE WHEN процессор_id         IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN материнская_плата_id IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN озу_id               IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN видеокарта_id        IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN охлаждение_id        IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN накопитель_id        IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN блокпитания_id       IS NOT NULL THEN 1 ELSE 0 END) +
    (CASE WHEN корпус_id            IS NOT NULL THEN 1 ELSE 0 END)
    = 1
);


-- ---------------------------------------------------------------------
-- 14. Статусная машина заказа
--     Разрешённые переходы хранятся в отдельной справочной таблице,
--     чтобы валидация выполнялась и в БД, и в сервисе, и в MCP-сервере.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ПереходыСтатусовЗаказа" (
    из_status   order_status NOT NULL,
    в_status    order_status NOT NULL,
    роль_кто    user_role    NOT NULL,
    PRIMARY KEY (из_status, в_status)
);

INSERT INTO "ПереходыСтатусовЗаказа" ("из_status", "в_status", "роль_кто") VALUES
    ('Новый',       'В обработке', 'manager'),
    ('Новый',       'Отменён',     'customer'),
    ('В обработке', 'Собран',      'manager'),
    ('В обработке', 'Отменён',     'customer'),
    ('Собран',      'Отправлен',   'manager'),
    ('Отправлен',   'Доставлен',   'manager')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE "ПереходыСтатусовЗаказа" IS
    'Разрешённые переходы статусов заказа. Отмена разрешена только из «Новый» и «В обработке» — это бизнес-правило, которое не может обойти ни REST-API, ни MCP-инструмент cancel_order.';

-- Запрет отмены уже отправленного/доставленного заказа на уровне БД
CREATE OR REPLACE FUNCTION fn_order_cancel_guard() RETURNS trigger AS $$
BEGIN
    IF NEW.статус = 'Отменён' AND OLD.статус IN ('Собран', 'Отправлен', 'Доставлен') THEN
        RAISE EXCEPTION
            'Недопустимый переход: заказ №% в статусе "%" нельзя отменить',
            OLD.номер, OLD.статус
            USING ERRCODE = 'check_violation';
    END IF;
    NEW.обновлён_в = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_order_cancel_guard ON "Заказы";
CREATE TRIGGER trg_order_cancel_guard
    BEFORE UPDATE ON "Заказы"
    FOR EACH ROW EXECUTE FUNCTION fn_order_cancel_guard();


-- ---------------------------------------------------------------------
-- 15. Триггеры служебных полей
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_touch_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.обновлён_в = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_touch  ON "Пользователи";
CREATE TRIGGER trg_users_touch BEFORE UPDATE ON "Пользователи"
    FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

DROP TRIGGER IF EXISTS trg_builds_touch ON "Сборки";
CREATE TRIGGER trg_builds_touch BEFORE UPDATE ON "Сборки"
    FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();


-- ---------------------------------------------------------------------
-- 16. Генерация номера заказа вида PCH-2026-000001
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_next_order_number() RETURNS varchar AS $$
DECLARE
    v_seq INTEGER;
BEGIN
    -- Внутренний SQL заключён в ОТДЕЛЬНЫЙ dollar-quote $q$…$q$, а не в
    -- обычные кавычки: внутри него одинарные кавычки не нужно удваивать.
    -- Это снимает самый частый источник ошибок вида
    -- «unterminated quoted string» при вложенном экранировании.
    EXECUTE $q$
        SELECT COALESCE(MAX(SUBSTRING(номер FROM 9)::int), 0) + 1
          FROM "Заказы"
         WHERE номер LIKE 'PCH-%-'
    $q$
    INTO v_seq;

    RETURN 'PCH-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(v_seq::text, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Уникальность номера на уровне БД (номер передаётся из сервиса,
-- но подстраховка от гонки при параллельном оформлении)
ALTER TABLE "Заказы" DROP CONSTRAINT IF EXISTS uq_order_number;
ALTER TABLE "Заказы" ADD CONSTRAINT uq_order_number UNIQUE (номер);


-- ---------------------------------------------------------------------
-- 17. Ограничение целостности остатков при списании
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_release_stock() RETURNS trigger AS $$
BEGIN
    UPDATE "Наличие"
       SET зарезервировано = GREATEST(зарезервировано - NEW.количество, 0),
           обновлено       = now()
     WHERE тип_компонента = NEW.тип_компонента
       AND идентификатор  = NEW.идентификатор;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_order_items_release_stock ON "Заказ_Позиции";
CREATE TRIGGER trg_order_items_release_stock
    AFTER INSERT ON "Заказ_Позиции"
    FOR EACH ROW EXECUTE FUNCTION fn_release_stock();

COMMIT;