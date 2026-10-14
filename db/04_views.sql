-- =====================================================================
--  PCHelper — представления для API (db/04_views.sql)
--  Единая точка доступа для 8 разнородных каталогов.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 18. v_каталог — унифицированный вид каталога
--     Возвращает общий набор колонок + специфичные характеристики в JSONB.
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_каталог AS
    SELECT 'cpu'::component_type          AS тип,
           id, название, производитель, NULL::int AS подкатегория,
           цена, фото_url, tdp,
           jsonb_build_object('сокет', сокет,
                              'ядра',  ядра_потоки -> 'cores',
                              'потоки', ядра_потоки -> 'threads',
                              'базовая_частота', частота -> 'base',
                              'турбо_частота',   частота -> 'boost',
                              'поддержка_памяти', поддержка_памяти,
                              'встроенная_графика', встроенная_графика) AS характеристики,
           создан_в
      FROM "Процессоры"
UNION ALL
    SELECT 'motherboard', id, название, NULL, NULL,
           цена, фото_url, NULL,
           jsonb_build_object('сокет', сокет, 'тип_памяти', тип_памяти,
                              'форм_фактор', форм_фактор, 'чипсет', чипсет,
                              'фазы_питания', фазы_питания,
                              'макс_объем_памяти', макс_объем_памяти,
                              'm2_слоты', m2_слоты, 'sata_порты', sata_порты),
           создан_в
      FROM "МатеринскиеПлаты"
UNION ALL
    SELECT 'ram', id, название, NULL, NULL,
           цена, фото_url, NULL,
           jsonb_build_object('объем', объем, 'частота', частота, 'тип', тип,
                              'профили_разгона', профили_разгона,
                              'тайминги', тайминги),
           создан_в
      FROM "ОЗУ"
UNION ALL
    SELECT 'cooling', id, название, NULL, NULL,
           цена, фото_url, tdp,
           jsonb_build_object('тип', тип, 'высота', высота,
                              'длина_радиатора', длина_радиатора,
                              'шум_макс', шум_макс),
           создан_в
      FROM "СистемыОхлаждения"
UNION ALL
    SELECT 'gpu', id, название, производитель, NULL,
           цена, фото_url, tdp,
           jsonb_build_object('объем_памяти', объем_памяти, 'длина', длина,
                              'количество_вентиляторов', количество_вентиляторов,
                              'толщина_в_слотах', толщина_в_слотах),
           создан_в
      FROM "Видеокарты"
UNION ALL
    SELECT 'storage', id, название, NULL, NULL,
           цена, фото_url, NULL,
           jsonb_build_object('объем_в_гб', объем_в_гб, 'тип', тип,
                              'интерфейс', интерфейс,
                              'скорость_чтения', скорость_чтения_записи -> 'read',
                              'скорость_записи', скорость_чтения_записи -> 'write',
                              'драм_буфер', драм_буфер,
                              'радиатор_охлаждения', радиатор_охлаждения),
           создан_в
      FROM "Накопители"
UNION ALL
    SELECT 'psu', id, название, NULL, NULL,
           цена, фото_url, мощность_в_ваттах,
           jsonb_build_object('мощность', мощность_в_ваттах, 'pcie_gen5', pcie_gen5,
                              'количество_pcie', количество_pcie,
                              'количество_cpu', количество_cpu,
                              'количество_sata', количество_sata,
                              'стандарт', стандарт_блока_питания,
                              '80plus', сертификат_80plus,
                              'cybenetics', сертификат_cybenetics,
                              'модульный', модульный),
           создан_в
      FROM "БлокиПитания"
UNION ALL
    SELECT 'case', id, название, NULL, NULL,
           цена, фото_url, NULL,
           jsonb_build_object('форм_фактор', форм_фактор,
                              'макс_длина_gpu', макс_длина_gpu,
                              'макс_высота_кулера', макс_высота_кулера,
                              'поддержка_сжо', поддержка_сжо,
                              'макс_длина_радиатора', макс_длина_радиатора,
                              'вентиляторы_в_комплекте', вентиляторы_в_комплекте),
           создан_в
      FROM "Корпуса";

COMMENT ON VIEW v_каталог IS
    'Единый каталог для GET /api/v1/catalog/components. Характеристики разнородных сущностей приведены к JSONB.';


-- ---------------------------------------------------------------------
-- 19. v_остатки — остатки с признаком «мало на складе»
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_остатки AS
    SELECT н.тип_компонента,
           н.идентификатор,
           к.название,
           к.цена,
           н.количество,
           н.зарезервировано,
           GREATEST(н.количество - н.зарезервировано, 0) AS доступно,
           н.количество <= н.порог_малого AS заканчивается,
           н.обновлено
      FROM "Наличие" н
      JOIN v_каталог к
        ON к.тип = н.тип_компонента
       AND к.id  = н.идентификатор;


-- ---------------------------------------------------------------------
-- 20. v_готовые_конфигурации — цена считается, а не хранится
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_готовые_конфигурации AS
    SELECT гк.id,
           гк.название,
           гк.задачи,
           гк.фото_url,
           COALESCE(cpu.цена,0) + COALESCE(mb.цена,0) + COALESCE(ram.цена,0)
             + COALESCE(gpu.цена,0) + COALESCE(cool.цена,0)
             + COALESCE(psu.цена,0) + COALESCE(chs.цена,0)
             + COALESCE(stg_total.сумма, 0)                       AS цена,
           jsonb_build_object(
               'процессор',         cpu.id,
               'материнская_плата', mb.id,
               'озу',               ram.id,
               'видеокарта',        gpu.id,
               'охлаждение',        cool.id,
               'блок_питания',      psu.id,
               'корпус',            chs.id,
               'накопители',        stg_total.идентификаторы
           ) AS состав
      FROM "ГотовыеКонфигурации" гк
      LEFT JOIN "Процессоры"       cpu  ON cpu.id  = гк.процессор_id
      LEFT JOIN "МатеринскиеПлаты" mb   ON mb.id   = гк.материнская_плата_id
      LEFT JOIN "ОЗУ"               ram  ON ram.id  = гк.озу_id
      LEFT JOIN "Видеокарты"        gpu  ON gpu.id  = гк.видеокарта_id
      LEFT JOIN "СистемыОхлаждения" cool ON cool.id = гк.охлаждение_id
      LEFT JOIN "БлокиПитания"      psu  ON psu.id  = гк.блокпитания_id
      LEFT JOIN "Корпуса"           chs  ON chs.id  = гк.корпус_id
      LEFT JOIN (
            SELECT кн.конфигурация_id,
                   SUM(н.цена)   AS сумма,
                   jsonb_agg(кн.накопитель_id) AS идентификаторы
              FROM "КонфигурацияНакопители" кн
              JOIN "Накопители" н ON н.id = кн.накопитель_id
             GROUP BY кн.конфигурация_id
      ) stg_total ON stg_total.конфигурация_id = гк.id;


-- ---------------------------------------------------------------------
-- 21. v_заказы_детально — заказ со снимком позиций
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_заказы_детально AS
    SELECT з.id,
           з.номер,
           з.пользователь_id,
           п.имя  AS покупатель,
           п.email,
           з.статус,
           з.способ_доставки,
           з.адрес_доставки,
           з.телефон,
           з.способ_оплаты,
           з.скидка,
           з.итоговая_сумма,
           з.трек_номер,
           з.комментарий_менеджера,
           з.создан_в,
           з.обновлён_в,
           COALESCE(jsonb_agg(jsonb_build_object(
               'тип',        оп.тип_компонента,
               'id',         оп.идентификатор,
               'название',   оп.название,
               'количество', оп.количество,
               'цена',       оп.цена_за_единицу,
               'сумма',      оп.сумма
           )) FILTER (WHERE оп.id IS NOT NULL), '[]'::jsonb) AS позиции
      FROM "Заказы" з
      JOIN "Пользователи" п ON п.id = з.пользователь_id
      LEFT JOIN "Заказ_Позиции" оп ON оп.заказ_id = з.id
     GROUP BY з.id, п.имя, п.email;


-- ---------------------------------------------------------------------
-- 22. Функция проверки совместимости (8 правил, см. отчёт, раздел 3.4)
--     Возвращает таблицу проблем; используется и REST-API, и MCP-сервером.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_check_compatibility(
    p_cpu   integer, p_mobo  integer, p_ram  integer,
    p_cool  integer, p_gpu   integer, p_stg   integer[],
    p_psu   integer, p_case  integer
) RETURNS TABLE (
    уровень text, код text, сообщение text
) AS $$
DECLARE
    -- Полные строки компонентов: удобно обращаться к любому столбцу по имени.
    v_cpu  "Процессоры"%ROWTYPE;
    v_mobo "МатеринскиеПлаты"%ROWTYPE;
    v_ram  "ОЗУ"%ROWTYPE;
    v_cool "СистемыОхлаждения"%ROWTYPE;
    v_gpu  "Видеокарты"%ROWTYPE;
    v_psu  "БлокиПитания"%ROWTYPE;
    v_case "Корпуса"%ROWTYPE;
    v_need integer;
    v_rank jsonb := '{"Mini-ITX":1,"Micro-ATX":2,"ATX":3,"E-ATX":4}'::jsonb;
BEGIN
    -- Загружаем выбранные компоненты. Если идентификатор не найден,
    -- переменная останется NULL и соответствующее правило просто не
    -- сработает — это корректно для частичной конфигурации.
    SELECT * INTO v_cpu  FROM "Процессоры"       WHERE id = p_cpu;
    SELECT * INTO v_mobo FROM "МатеринскиеПлаты" WHERE id = p_mobo;
    SELECT * INTO v_ram  FROM "ОЗУ"               WHERE id = p_ram;
    SELECT * INTO v_cool FROM "СистемыОхлаждения" WHERE id = p_cool;
    SELECT * INTO v_gpu  FROM "Видеокарты"        WHERE id = p_gpu;
    SELECT * INTO v_psu  FROM "БлокиПитания"      WHERE id = p_psu;
    SELECT * INTO v_case FROM "Корпуса"           WHERE id = p_case;

    -- ВАЖНО про синтаксис: у функции объявлены выходные параметры
    -- (уровень, код, сообщение). Конструкция
    --     INSERT INTO уровень, код, сообщение VALUES (...)
    -- НЕДОПУСТИМА — список переменных не является целью INSERT.
    -- Правильный способ добавить строку в результат:
    --     присвоить значения выходным переменным и выполнить RETURN NEXT.

    -- Правило 1: сокет процессора и материнской платы
    IF v_cpu.id IS NOT NULL AND v_mobo.id IS NOT NULL AND v_cpu.сокет <> v_mobo.сокет THEN
        уровень := 'error';
        код := 'SOCKET_MISMATCH';
        сообщение := format('Сокет процессора (%s) не совпадает с сокетом платы (%s)',
                            v_cpu.сокет, v_mobo.сокет);
        RETURN NEXT;
    END IF;

    -- Правило 2: тип памяти
    IF v_mobo.id IS NOT NULL AND v_ram.id IS NOT NULL AND v_mobo.тип_памяти <> v_ram.тип THEN
        уровень := 'error';
        код := 'MEMORY_TYPE_MISMATCH';
        сообщение := format('Плата поддерживает %s, выбрана память %s',
                            v_mobo.тип_памяти, v_ram.тип);
        RETURN NEXT;
    END IF;

    -- Правило 3: иерархия форм-факторов (корпус не меньше платы)
    IF v_mobo.id IS NOT NULL AND v_case.id IS NOT NULL
       AND (v_rank ->> v_mobo.форм_фактор)::int > (v_rank ->> v_case.форм_фактор)::int THEN
        уровень := 'error';
        код := 'FORM_FACTOR_MISMATCH';
        сообщение := format('Корпус %s не вмещает плату %s',
                            v_case.форм_фактор, v_mobo.форм_фактор);
        RETURN NEXT;
    END IF;

    -- Правило 4: длина видеокарты
    IF v_gpu.id IS NOT NULL AND v_case.id IS NOT NULL AND v_gpu.длина > v_case.макс_длина_gpu THEN
        уровень := 'error';
        код := 'GPU_TOO_LONG';
        сообщение := format('Видеокарта %s мм длиннее максимума корпуса (%s мм)',
                            v_gpu.длина, v_case.макс_длина_gpu);
        RETURN NEXT;
    END IF;

    -- Правило 5: тепловая мощность охлаждения
    IF v_cool.id IS NOT NULL AND v_cpu.id IS NOT NULL AND v_cool.tdp < v_cpu.tdp THEN
        уровень := 'error';
        код := 'COOLER_TDP_TOO_LOW';
        сообщение := format('Охлаждение на %s Вт не отводит %s Вт процессора',
                            v_cool.tdp, v_cpu.tdp);
        RETURN NEXT;
    END IF;

    -- Правило 6: габариты кулера / радиатора СЖО
    IF v_cool.id IS NOT NULL AND v_case.id IS NOT NULL THEN
        IF v_cool.тип = 'Воздушное' AND v_cool.высота > v_case.макс_высота_кулера THEN
            уровень := 'error';
            код := 'COOLER_TOO_TALL';
            сообщение := format('Кулер %s мм выше максимума корпуса (%s мм)',
                                v_cool.высота, v_case.макс_высота_кулера);
            RETURN NEXT;
        ELSIF v_cool.тип = 'Жидкостное' AND v_cool.длина_радиатора > v_case.макс_длина_радиатора THEN
            уровень := 'error';
            код := 'RADIATOR_TOO_LONG';
            сообщение := format('Радиатор СЖО %s мм длиннее максимума корпуса (%s мм)',
                                v_cool.длина_радиатора, v_case.макс_длина_радиатора);
            RETURN NEXT;
        END IF;
    END IF;

    -- Правило 7: запас мощности блока питания 25 %
    v_need := CEIL(((COALESCE(v_cpu.tdp, 0) + COALESCE(v_gpu.tdp, 0)) * 1.25));
    IF v_psu.id IS NOT NULL AND v_psu.мощность_в_ваттах < v_need THEN
        уровень := 'error';
        код := 'PSU_INSUFFICIENT';
        сообщение := format('Требуется минимум %s Вт (TDP %s + %s, запас 25 %%), выбран БП на %s Вт',
                            v_need, COALESCE(v_cpu.tdp, 0), COALESCE(v_gpu.tdp, 0),
                            v_psu.мощность_в_ваттах);
        RETURN NEXT;
    ELSIF v_psu.id IS NOT NULL AND v_psu.мощность_в_ваттах < v_need * 1.15 THEN
        уровень := 'warning';
        код := 'PSU_LOW_HEADROOM';
        сообщение := format('Запас мощности БП менее 15 %% — рекомендуется от %s Вт',
                            CEIL(v_need * 1.15));
        RETURN NEXT;
    END IF;

    -- Правило 8: ровно один SSD и не более одного HDD
    IF p_stg IS NOT NULL AND array_length(p_stg, 1) > 0 THEN
        IF (SELECT COUNT(*) FROM "Накопители"
              WHERE id = ANY(p_stg) AND тип = 'SSD') <> 1 THEN
            уровень := 'error';
            код := 'SSD_COUNT';
            сообщение := 'В сборке должен быть ровно один SSD';
            RETURN NEXT;
        END IF;
        IF (SELECT COUNT(*) FROM "Накопители"
              WHERE id = ANY(p_stg) AND тип = 'HDD') > 1 THEN
            уровень := 'error';
            код := 'HDD_COUNT';
            сообщение := 'Допустим не более одного HDD';
            RETURN NEXT;
        END IF;
    END IF;

    RETURN;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION fn_check_compatibility IS
    'Единая функция проверки совместимости: 8 правил. Используется сервисом CompatibilityService (REST) и MCP-инструментом check_compatibility.';

COMMIT;