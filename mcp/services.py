"""
PCHelper MCP-сервер — доменная логика.

Слой не зависит от MCP: те же функции используются из тестов (pytest)
и из инструментов, ресурсов и промптов сервера. Это позволяет
покрыть бизнес-правила обычными юнит-тестами.

Ключевое бизнес-правило: **отменить заказ, который уже собран,
отправлен или доставлен, нельзя**. Правило проверяется здесь
(для MCP-инструмента), в сервисе заказов REST-API и триггером БД —
тройная защита.
"""

from __future__ import annotations

import math
import sqlite3
from typing import Any

from db import (
    CANCELLABLE_STATUSES,
    COMPONENT_TYPES,
    FORM_RANK,
    ORDER_STATUSES,
    PSU_HEADROOM,
    TABLE_BY_TYPE,
    get_conn,
    loads,
    rows_to_dicts,
)

# ---------------------------------------------------------------------
# Вспомогательные функции
# ---------------------------------------------------------------------


class BusinessError(Exception):
    """Бизнес-ошибка: сервер MCP возвращает её LLM как isError с пояснением."""


def _fetch_one(conn: sqlite3.Connection, sql: str, params: tuple = ()) -> dict | None:
    """Выполняет SELECT и возвращает первую строку как словарь.

    params передаётся параметризованно — это защита от SQL-инъекций.
    Возвращает None, если подходящих строк нет.
    """
    row = conn.execute(sql, params).fetchone()
    return dict(row) if row else None


def _component(conn: sqlite3.Connection, component_type: str, component_id: int) -> dict:
    """Возвращает карточку компонента по типу и идентификатору.

    Тип ОбяЗАТЕЛЕН: идентификаторы в восьми таблицах каталога
    независимы, поэтому «компонент 3» без типа неоднозначен.
    JSONB-поля разворачиваются в словари.
    При нарушении — BusinessError с понятным агенту текстом.
    """
    table = TABLE_BY_TYPE.get(component_type)
    if table is None:
        raise BusinessError(
            f"Неизвестный тип компонента «{component_type}». "
            f"Допустимые значения: {', '.join(COMPONENT_TYPES)}."
        )
    row = _fetch_one(conn, f'SELECT * FROM "{table}" WHERE id = ?', (component_id,))
    if row is None:
        raise BusinessError(f"Компонент с идентификатором {component_id} типа {component_type} не найден в каталоге.")
    for key in ("ядра_потоки", "частота"):
        if key in row:
            row[key] = loads(row[key], {})
    return row


def _price_of(conn: sqlite3.Connection, component_type: str, component_id: int) -> tuple[str, int]:
    """Достаёт пару (название, цена) компонента из каталога.

    Используется при фиксации позиции заказа: сервер записывает
    СНИМОК названия и цены, чтобы изменение цены в каталоге
    не переписало историю уже оформленных заказов.
    """
    table = TABLE_BY_TYPE[component_type]
    row = _fetch_one(conn, f'SELECT название, цена FROM "{table}" WHERE id = ?', (component_id,))
    if row is None:
        raise BusinessError(f"Компонент {component_type}:{component_id} не найден в каталоге.")
    return row["название"], int(row["цена"])


def _issue(level: str, code: str, field: str | None, message: str) -> dict:
    """Собирает описание одной проблемы совместимости.

    level: "error" — блокирует оформление заказа;
           "warning" — заказ оформить можно, но покупателя
                        стоит предупредить.
    code:  машинночитаемый код (SOCKET_MISMATCH, PSU_INSUFFICIENT …).
    Те же коды используются в openapi.yaml и в SQL-функции
    fn_check_compatibility — единый словарь ошибок на всю систему.
    """
    return {"level": level, "code": code, "field": field, "message": message}


# ---------------------------------------------------------------------
# Каталог
# ---------------------------------------------------------------------


def search_components(
    component_type: str | None = None,
    brand: str | None = None,
    query: str | None = None,
    min_price: int | None = None,
    max_price: int | None = None,
    sort: str = "price_asc",
    limit: int = 20,
) -> list[dict]:
    """Каталог комплектующих с фильтрами. Аналог GET /catalog/components."""
    if component_type is not None and component_type not in TABLE_BY_TYPE:
        raise BusinessError(
            f"Неизвестный тип компонента «{component_type}». Допустимые: {', '.join(COMPONENT_TYPES)}."
        )
    if min_price is not None and max_price is not None and min_price > max_price:
        raise BusinessError("minPrice не может превышать maxPrice.")

    types = [component_type] if component_type else list(COMPONENT_TYPES)
    result: list[dict] = []
    with get_conn() as conn:
        for t in types:
            table = TABLE_BY_TYPE[t]
            sql = f'SELECT * FROM "{table}" WHERE 1=1'
            params: list[Any] = []
            if "производитель" in _columns(conn, table):
                if brand:
                    sql += " AND производитель LIKE ?"
                    params.append(f"%{brand}%")
            if query:
                sql += " AND название LIKE ?"
                params.append(f"%{query}%")
            if min_price is not None:
                sql += " AND цена >= ?"
                params.append(min_price)
            if max_price is not None:
                sql += " AND цена <= ?"
                params.append(max_price)
            for row in rows_to_dicts(conn.execute(sql, params).fetchall()):
                row["componentType"] = t
                row["компонент_id"] = row["id"]
                result.append(row)

    reverse = sort in ("price_desc",)
    if sort == "price_asc":
        result.sort(key=lambda r: r.get("цена") or 0)
    elif sort == "price_desc":
        result.sort(key=lambda r: r.get("цена") or 0, reverse=True)
    elif sort == "name":
        result.sort(key=lambda r: r.get("название") or "")
    elif reverse:
        result.sort(key=lambda r: r.get("цена") or 0, reverse=True)
    return result[: max(1, min(limit, 100))]


_COLUMN_CACHE: dict[str, set[str]] = {}


def _columns(conn: sqlite3.Connection, table: str) -> set[str]:
    """Возвращает множество имён столбцов таблицы (с кешированием)."""
    if table not in _COLUMN_CACHE:
        _COLUMN_CACHE[table] = {r["name"] for r in conn.execute(f'PRAGMA table_info("{table}")')}
    return _COLUMN_CACHE[table]


def get_component(component_type: str, component_id: int) -> dict:
    """Карточка компонента с остатком на складе."""
    with get_conn() as conn:
        item = _component(conn, component_type, component_id)
        stock = _fetch_one(
            conn,
            'SELECT количество, зарезервировано FROM "Наличие" '
            "WHERE тип_компонента = ? AND идентификатор = ?",
            (component_type, component_id),
        )
    item["componentType"] = component_type
    item["компонент_id"] = component_id
    item["наличие"] = (stock["количество"] - stock["зарезервировано"]) if stock else 0
    return item


# ---------------------------------------------------------------------
# Совместимость — те же 8 правил, что и в db/04_views.sql (fn_check_compatibility)
# ---------------------------------------------------------------------


def check_compatibility(
    cpu_id: int,
    motherboard_id: int,
    ram_id: int,
    cooling_id: int | None = None,
    gpu_id: int | None = None,
    storage_ids: list[int] | None = None,
    psu_id: int | None = None,
    case_id: int | None = None,
) -> dict:
    """Проверяет конфигурацию по 8 правилам совместимости."""
    storage_ids = storage_ids or []
    errors: list[dict] = []
    warnings: list[dict] = []

    with get_conn() as conn:
        cpu = _component(conn, "cpu", cpu_id)
        mobo = _component(conn, "motherboard", motherboard_id)
        ram = _component(conn, "ram", ram_id)
        cooling = _component(conn, "cooling", cooling_id) if cooling_id else None
        gpu = _component(conn, "gpu", gpu_id) if gpu_id else None
        psu = _component(conn, "psu", psu_id) if psu_id else None
        case = _component(conn, "case", case_id) if case_id else None
        storages = [_component(conn, "storage", sid) for sid in storage_ids]

        # Правило 1 — сокет
        if cpu["сокет"] != mobo["сокет"]:
            errors.append(_issue("error", "SOCKET_MISMATCH", "motherboardId",
                                 f"Сокет процессора ({cpu['сокет']}) не совпадает с сокетом платы ({mobo['сокет']})."))

        # Правило 2 — тип памяти
        if mobo["тип_памяти"] != ram["тип"]:
            errors.append(_issue("error", "MEMORY_TYPE_MISMATCH", "ramId",
                                 f"Плата поддерживает {mobo['тип_памяти']}, выбрана память {ram['тип']}."))

        # Правило 3 — иерархия форм-факторов
        if case is not None:
            board_rank = FORM_RANK.get(mobo["форм_фактор"])
            case_rank = FORM_RANK.get(case["форм_фактор"])
            if board_rank and case_rank and board_rank > case_rank:
                errors.append(_issue("error", "FORM_FACTOR_MISMATCH", "caseId",
                                     f"Корпус {case['форм_фактор']} не вмещает плату {mobo['форм_фактор']}."))

            # Правило 4 — длина видеокарты
            if gpu is not None and gpu["длина"] > case["макс_длина_gpu"]:
                errors.append(_issue("error", "GPU_TOO_LONG", "caseId",
                                     f"Видеокарта {gpu['длина']} мм длиннее максимума корпуса ({case['макс_длина_gpu']} мм)."))

            # Правило 6 — габариты охлаждения
            if cooling is not None:
                if cooling["тип"] == "Воздушное" and cooling["высота"] and cooling["высота"] > case["макс_высота_кулера"]:
                    errors.append(_issue("error", "COOLER_TOO_TALL", "coolingId",
                                         f"Кулер {cooling['высота']} мм выше максимума корпуса ({case['макс_высота_кулера']} мм)."))
                if (cooling["тип"] == "Жидкостное" and cooling["длина_радиатора"]
                        and case["макс_длина_радиатора"]
                        and cooling["длина_радиатора"] > case["макс_длина_радиатора"]):
                    errors.append(_issue("error", "RADIATOR_TOO_LONG", "coolingId",
                                         f"Радиатор СЖО {cooling['длина_радиатора']} мм длиннее максимума корпуса "
                                         f"({case['макс_длина_радиатора']} мм)."))

        # Правило 5 — тепловая мощность охлаждения
        if cooling is not None and cooling["tdp"] < cpu["tdp"]:
            errors.append(_issue("error", "COOLER_TDP_TOO_LOW", "coolingId",
                                 f"Охлаждение на {cooling['tdp']} Вт не отводит {cpu['tdp']} Вт процессора."))

        # Правило 7 — мощность БП с запасом 25 %
        need = math.ceil((cpu["tdp"] + (gpu["tdp"] if gpu else 0)) * PSU_HEADROOM)
        if psu is not None:
            if psu["мощность_в_ваттах"] < need:
                errors.append(_issue("error", "PSU_INSUFFICIENT", "psuId",
                                     f"Требуется минимум {need} Вт "
                                     f"(TDP CPU {cpu['tdp']} + GPU {gpu['tdp'] if gpu else 0}, запас 25 %), "
                                     f"выбран БП на {psu['мощность_в_ваттах']} Вт."))
            elif psu["мощность_в_ваттах"] < need * 1.15:
                warnings.append(_issue("warning", "PSU_LOW_HEADROOM", "psuId",
                                       f"Запас мощности БП менее 15 % — рекомендуется от {math.ceil(need * 1.15)} Вт."))

        # Правило 8 — ровно один SSD и не более одного HDD
        if storages:
            ssd = sum(1 for s in storages if s["тип"] == "SSD")
            hdd = sum(1 for s in storages if s["тип"] == "HDD")
            if ssd != 1:
                errors.append(_issue("error", "SSD_COUNT", "storageIds",
                                     f"В сборке должен быть ровно один SSD (сейчас {ssd})."))
            if hdd > 1:
                errors.append(_issue("error", "HDD_COUNT", "storageIds",
                                     f"Допустим не более одного HDD (сейчас {hdd})."))

        total = (cpu.get("цена", 0) + mobo.get("цена", 0) + ram.get("цена", 0)
                 + (cooling.get("цена", 0) if cooling else 0)
                 + (gpu.get("цена", 0) if gpu else 0)
                 + sum(s.get("цена", 0) for s in storages)
                 + (psu.get("цена", 0) if psu else 0)
                 + (case.get("цена", 0) if case else 0))

    return {
        "compatible": not errors,
        "errors": errors,
        "warnings": warnings,
        "totalPrice": total,
        "requiredPsuWatts": need,
    }


def recommend_psu(cpu_id: int, gpu_id: int | None = None, headroom: float = PSU_HEADROOM) -> dict:
    """Подбор БП по TDP процессора и видеокарты (GET /configurator/psu/recommend)."""
    with get_conn() as conn:
        cpu = _component(conn, "cpu", cpu_id)
        gpu = _component(conn, "gpu", gpu_id) if gpu_id else None
        cpu_tdp = int(cpu["tdp"])
        gpu_tdp = int(gpu["tdp"]) if gpu else 0
        needed = math.ceil((cpu_tdp + gpu_tdp) * headroom)
        candidates = [
            {**r, "componentType": "psu", "запас_в_ваттах": r["мощность_в_ваттах"] - needed}
            for r in rows_to_dicts(
                conn.execute('SELECT * FROM "БлокиПитания" WHERE мощность_в_ваттах >= ? ORDER BY цена', (needed,))
            )
        ]
    classes = (350, 450, 550, 650, 750, 850, 1000, 1200)
    return {
        "cpuTdp": cpu_tdp,
        "gpuTdp": gpu_tdp,
        "recommendedWatts": needed,
        "recommendedWattageClass": next((c for c in classes if c >= needed), needed),
        "alternatives": candidates,
    }


# ---------------------------------------------------------------------
# Корзина
# ---------------------------------------------------------------------


def _cart_id(conn: sqlite3.Connection, user_id: int) -> int:
    """Возвращает идентификатор корзины, создавая её при необходимости.

    У пользователя одна активная корзина (UNIQUE на пользователь_id),
    поэтому функция сначала ищет существующую и только затем создаёт.
    """
    row = _fetch_one(conn, 'SELECT id FROM "Корзины" WHERE пользователь_id = ?', (user_id,))
    if row:
        return int(row["id"])
    cur = conn.execute('INSERT INTO "Корзины" (пользователь_id) VALUES (?)', (user_id,))
    return int(cur.lastrowid)


def get_cart(user_id: int) -> dict:
    """Корзина пользователя с пересчитанной стоимостью."""
    with get_conn() as conn:
        cart = _fetch_one(conn, 'SELECT * FROM "Корзины" WHERE пользователь_id = ?', (user_id,))
        if not cart:
            return {"id": None, "userId": user_id, "items": [], "totalQuantity": 0, "totalPrice": 0}
        rows = rows_to_dicts(
            conn.execute('SELECT * FROM "Корзина_Позиции" WHERE корзина_id = ? ORDER BY id', (cart["id"],))
        )
        for r in rows:
            # Название подтягивается из каталога, цена остаётся снимком
            # на момент добавления позиции в корзину.
            r["название"] = _price_of(conn, r["тип_компонента"], r["идентификатор"])[0]
            r["сумма"] = r["цена"] * r["количество"]
    return {
        "id": cart["id"],
        "userId": user_id,
        "items": rows,
        "totalQuantity": sum(r["количество"] for r in rows),
        "totalPrice": sum(r["сумма"] for r in rows),
    }


def add_to_cart(user_id: int, component_type: str, component_id: int, quantity: int = 1) -> dict:
    """Добавляет позицию в корзину с проверкой остатка."""
    if quantity < 1 or quantity > 10:
        raise BusinessError("Количество должно быть от 1 до 10.")
    with get_conn() as conn:
        title, price = _price_of(conn, component_type, component_id)
        stock = _fetch_one(
            conn,
            'SELECT количество, зарезервировано FROM "Наличие" WHERE тип_компонента = ? AND идентификатор = ?',
            (component_type, component_id),
        )
        available = (stock["количество"] - stock["зарезервировано"]) if stock else 0
        if quantity > available:
            raise BusinessError(f"Недостаточно товара «{title}»: доступно {available} шт., запрошено {quantity}.")

        cart_id = _cart_id(conn, user_id)
        existing = _fetch_one(
            conn,
            'SELECT * FROM "Корзина_Позиции" WHERE корзина_id = ? AND тип_компонента = ? AND идентификатор = ?',
            (cart_id, component_type, component_id),
        )
        if existing:
            new_qty = min(existing["количество"] + quantity, 10, available)
            conn.execute('UPDATE "Корзина_Позиции" SET количество = ? WHERE id = ?', (new_qty, existing["id"]))
        else:
            conn.execute(
                'INSERT INTO "Корзина_Позиции" (корзина_id, тип_компонента, идентификатор, количество, цена) '
                "VALUES (?, ?, ?, ?, ?)",
                (cart_id, component_type, component_id, quantity, price),
            )
        conn.execute("UPDATE \"Корзины\" SET обновлена = datetime('now') WHERE id = ?", (cart_id,))
        conn.commit()
    return get_cart(user_id)


def apply_promo_code(user_id: int, code: str) -> dict:
    """Возвращает параметры скидки по промокоду и итоговую стоимость корзины."""
    with get_conn() as conn:
        promo = _fetch_one(conn, 'SELECT * FROM "Промокоды" WHERE код = ? AND активен = 1', (code.upper(),))
    if not promo:
        raise BusinessError(f"Промокод «{code}» не найден или больше не активен.")
    cart = get_cart(user_id)
    if cart["totalPrice"] < promo["мин_сумма"]:
        raise BusinessError(f"Промокод «{code}» действует от {promo['мин_сумма']} BYN.")
    discount = (cart["totalPrice"] * promo["значение"] // 100) if promo["тип_скидки"] == "percent" else promo["значение"]
    return {
        "code": promo["код"],
        "type": promo["тип_скидки"],
        "value": promo["значение"],
        "discount": discount,
        "totalPrice": cart["totalPrice"] - discount,
    }


# ---------------------------------------------------------------------
# Заказы
# ---------------------------------------------------------------------


def _next_order_number(conn: sqlite3.Connection) -> str:
    """Генерирует следующий номер заказа вида PCH-2026-000042.

    Номер состоит из префикса PCH, года и порядкового номера
    с ведущими нулями до шести цифр. Порядковый номер вычисляется
    по максимальному существующему, поэтому после удаления заказа
    нумерация не «съезжает» назад.
    """
    row = _fetch_one(conn, "SELECT COUNT(*) AS n FROM \"Заказы\"")
    return f"PCH-2026-{(row['n'] if row else 0) + 1:06d}"


def create_order(
    user_id: int,
    delivery_method: str,
    phone: str,
    payment_method: str = "card",
    address: str | None = None,
    promo_code: str | None = None,
) -> dict:
    """Оформляет заказ: проверяет корзину, списывает резерв, фиксирует снимок цен."""
    if delivery_method in ("courier", "mail") and not address:
        raise BusinessError(f"При способе доставки «{delivery_method}» требуется адрес.")

    with get_conn() as conn:
        cart = get_cart(user_id)
        if not cart["items"]:
            raise BusinessError("Корзина пуста — нечего оформлять.")

        subtotal = 0
        positions: list[tuple] = []
        for item in cart["items"]:
            stock = _fetch_one(
                conn,
                'SELECT количество, зарезервировано FROM "Наличие" WHERE тип_компонента = ? AND идентификатор = ?',
                (item["тип_компонента"], item["идентификатор"]),
            )
            available = (stock["количество"] - stock["зарезервировано"]) if stock else 0
            if item["количество"] > available:
                raise BusinessError(f"Недостаточно товара «{item['название']}»: доступно {available} шт.")
            subtotal += item["сумма"]
            positions.append(
                (item["тип_компонента"], item["идентификатор"], item["название"],
                 item["цена"], item["количество"], item["сумма"])
            )

        discount = 0
        promo_code_norm = promo_code.upper() if promo_code else None
        if promo_code_norm:
            promo = _fetch_one(conn, 'SELECT * FROM "Промокоды" WHERE код = ? AND активен = 1', (promo_code_norm,))
            if not promo:
                raise BusinessError(f"Промокод «{promo_code}» не найден или больше не активен.")
            if subtotal < promo["мин_сумма"]:
                raise BusinessError(f"Промокод «{promo_code}» действует от {promo['мин_сумма']} BYN.")
            discount = (subtotal * promo["значение"] // 100) if promo["тип_скидки"] == "percent" else promo["значение"]

        number = _next_order_number(conn)
        cur = conn.execute(
            'INSERT INTO "Заказы" (номер, пользователь_id, статус, способ_доставки, адрес_доставки, телефон, '
            "способ_оплаты, скидка, итоговая_сумма, промокод) "
            "VALUES (?, ?, 'Новый', ?, ?, ?, ?, ?, ?, ?)",
            (number, user_id, delivery_method, address, phone, payment_method, discount, subtotal - discount, promo_code_norm),
        )
        order_id = int(cur.lastrowid)

        for pos in positions:
            conn.execute(
                'INSERT INTO "Заказ_Позиции" (заказ_id, тип_компонента, идентификатор, название, '
                "цена_за_единицу, количество, сумма) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (order_id, *pos),
            )
            conn.execute(
                'UPDATE "Наличие" SET зарезервировано = зарезервировано + ?, обновлено = datetime(\'now\') '
                "WHERE тип_компонента = ? AND идентификатор = ?",
                (pos[4], pos[0], pos[1]),
            )
        conn.execute('DELETE FROM "Корзина_Позиции" WHERE корзина_id = ?', (cart["id"],))
        if promo_code_norm:
            conn.execute('UPDATE "Промокоды" SET применено = применено + 1 WHERE код = ?', (promo_code_norm,))
        conn.commit()

    return get_order(order_id)


def get_order(order_id: int) -> dict:
    """Возвращает заказ вместе с его позициями.

    Позиции берутся из «Заказ_Позиции», где название и цена
    хранятся как снимок на момент оформления.
    """
    with get_conn() as conn:
        order = _fetch_one(conn, 'SELECT * FROM "Заказы" WHERE id = ?', (order_id,))
        if not order:
            raise BusinessError(f"Заказ {order_id} не найден.")
        items = rows_to_dicts(
            conn.execute('SELECT * FROM "Заказ_Позиции" WHERE заказ_id = ? ORDER BY id', (order_id,))
        )
    return {**order, "позиции": items}


def list_orders(user_id: int | None = None, status: str | None = None, limit: int = 20) -> list[dict]:
    """Возвращает список заказов с фильтрами.

    user_id — заказы конкретного покупателя; None — все заказы
              (используется менеджером и ресурсом orders://recent);
    status   — фильтр по статусу из справочника ORDER_STATUSES;
    limit    — ограничение выборки (1…100).
    """
    sql = 'SELECT * FROM "Заказы"'
    params: list[Any] = []
    where: list[str] = []
    if user_id is not None:
        where.append("пользователь_id = ?")
        params.append(user_id)
    if status:
        if status not in ORDER_STATUSES:
            raise BusinessError(f"Неизвестный статус «{status}». Допустимые: {', '.join(ORDER_STATUSES)}.")
        where.append("статус = ?")
        params.append(status)
    if where:
        sql += " WHERE " + " AND ".join(where)
    sql += " ORDER BY id DESC LIMIT ?"
    params.append(max(1, min(limit, 100)))
    with get_conn() as conn:
        return rows_to_dicts(conn.execute(sql, params).fetchall())


def _assert_transition(conn: sqlite3.Connection, current: str, target: str, actor_role: str) -> None:
    """Проверяет, разрешён ли переход статуса (справочник «ПереходыСтатусовЗаказа»)."""
    if current == target:
        return
    allowed = _fetch_one(
        conn,
        'SELECT 1 AS ok FROM "ПереходыСтатусовЗаказа" WHERE из_status = ? AND в_status = ? AND роль_кто = ?',
        (current, target, actor_role),
    )
    if not allowed:
        raise BusinessError(
            f"Недопустимый переход статуса «{current}» → «{target}» для роли «{actor_role}». "
            f"Допустимые переходы заданы справочником «ПереходыСтатусовЗаказа»."
        )


def set_order_status(order_id: int, status: str, comment: str | None = None, actor_role: str = "manager") -> dict:
    """Смена статуса заказа. Роль manager может менять любой разрешённый статус."""
    if status not in ORDER_STATUSES:
        raise BusinessError(f"Неизвестный статус «{status}». Допустимые: {', '.join(ORDER_STATUSES)}.")
    with get_conn() as conn:
        order = _fetch_one(conn, 'SELECT * FROM "Заказы" WHERE id = ?', (order_id,))
        if not order:
            raise BusinessError(f"Заказ {order_id} не найден.")
        _assert_transition(conn, order["статус"], status, actor_role)
        tracking = order["трек_номер"]
        if status == "Отправлен" and not tracking:
            tracking = f"BY-{7000000 + order_id * 137}"
        conn.execute(
            'UPDATE "Заказы" SET статус = ?, трек_номер = ?, комментарий_менеджера = COALESCE(?, комментарий_менеджера), '
            "обновлён_в = datetime('now') WHERE id = ?",
            (status, tracking, comment, order_id),
        )
        conn.commit()
    return get_order(order_id)


def cancel_order(order_id: int, reason: str, user_id: int | None = None) -> dict:
    """
    Отмена заказа покупателем.

    БИЗНЕС-ПРАВИЛО: отмена допустима только для статусов «Новый»
    и «В обработке». Агент (LLM) не может обойти это ограничение —
    сервер возвращает явную ошибку с объяснением.
    """
    if not reason or not reason.strip():
        raise BusinessError("Укажите причину отмены (1–500 символов).")
    with get_conn() as conn:
        order = _fetch_one(conn, 'SELECT * FROM "Заказы" WHERE id = ?', (order_id,))
        if not order:
            raise BusinessError(f"Заказ {order_id} не найден.")
        if user_id is not None and order["пользователь_id"] != user_id:
            raise BusinessError("Заказ принадлежит другому пользователю.")

        current = order["статус"]
        if current not in CANCELLABLE_STATUSES:
            conn.execute(
                'INSERT INTO "ЖурналДействийАгента" (агент, инструмент, аргументы, результат, код_ответа, успешно) '
                "VALUES (?, ?, ?, ?, ?, 0)",
                ("mcp-server", "cancel_order",
                 '{"orderId": %d, "reason": "%s"}' % (order_id, reason.replace('"', "'")),
                 f"Отказ: статус «{current}» не допускает отмены", 409),
            )
            conn.commit()
            raise BusinessError(
                f"Отмена невозможна: заказ {order['номер']} в статусе «{current}». "
                f"Отменять можно только заказы в статусе «{'», «'.join(CANCELLABLE_STATUSES)}». "
                f"После передачи в доставку возврат оформляется через службу поддержки."
            )

        conn.execute(
            'UPDATE "Заказы" SET статус = \'Отменён\', обновлён_в = datetime(\'now\') WHERE id = ?',
            (order_id,),
        )
        for item in conn.execute('SELECT * FROM "Заказ_Позиции" WHERE заказ_id = ?', (order_id,)).fetchall():
            conn.execute(
                'UPDATE "Наличие" SET зарезервировано = '
                "CASE WHEN зарезервировано - ? < 0 THEN 0 ELSE зарезервировано - ? END, "
                "обновлено = datetime('now') "
                "WHERE тип_компонента = ? AND идентификатор = ?",
                (item["количество"], item["количество"], item["тип_компонента"], item["идентификатор"]),
            )
        conn.execute(
            'INSERT INTO "ЖурналДействийАгента" (агент, инструмент, аргументы, результат, код_ответа, успешно) '
            "VALUES (?, ?, ?, ?, ?, 1)",
            ("mcp-server", "cancel_order", '{"orderId": %d}' % order_id, "Отменён", 200),
        )
        conn.commit()
    return get_order(order_id)


def track_order(order_id: int, tracking_number: str) -> dict:
    """
    Отслеживание заказа.

    Аргумент ``tracking_number`` обязателен и должен **строго совпадать**
    со значением, хранящимся в БД. Это вынуждает LLM сначала прочитать
    ресурс ``pchelper://orders/recent`` и только потом вызвать инструмент —
    ровно тот приём, который описан в задании 5.
    """
    with get_conn() as conn:
        order = _fetch_one(conn, 'SELECT * FROM "Заказы" WHERE id = ?', (order_id,))
        if not order:
            raise BusinessError(f"Заказ {order_id} не найден.")
        if not order["трек_номер"]:
            raise BusinessError(
                f"Заказ {order['номер']} ещё не передан в доставку — трек-номен не присвоен. "
                f"Текущий статус: «{order['статус']}»."
            )
        if not tracking_number or tracking_number.strip().upper() != order["трек_номер"].upper():
            raise BusinessError(
                f"Трек-номер не совпадает с данными заказа {order['номер']}. "
                f"Прочитайте ресурс pchelper://orders/recent и используйте точное значение "
                f"трек-номера из него."
            )
    return {
        "orderId": order_id,
        "orderNumber": order["номер"],
        "trackingNumber": order["трек_номер"],
        "status": order["статус"],
        "carrier": "Белпочта",
    }


# ---------------------------------------------------------------------
# Склад
# ---------------------------------------------------------------------


def check_stock(component_type: str | None = None, component_id: int | None = None,
                only_low: bool = False, limit: int = 50) -> list[dict]:
    """Остатки на складе (аналог GET /admin/stock)."""
    sql = (
        'SELECT н.тип_компонента, н.идентификатор, н.количество, н.зарезервировано, '
        "       MAX(н.количество - н.зарезервировано, 0) AS доступно "
        'FROM "Наличие" н WHERE 1=1'
    )
    params: list[Any] = []
    if component_type:
        sql += " AND н.тип_компонента = ?"
        params.append(component_type)
    if component_id:
        sql += " AND н.идентификатор = ?"
        params.append(component_id)
    if only_low:
        sql += " AND н.количество <= 3"
    sql += " ORDER BY н.тип_компонента, н.идентификатор LIMIT ?"
    params.append(max(1, min(limit, 200)))
    with get_conn() as conn:
        rows = rows_to_dicts(conn.execute(sql, params).fetchall())
    for r in rows:
        r["заканчивается"] = r["количество"] <= 3
    return rows