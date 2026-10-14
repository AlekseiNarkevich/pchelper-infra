#!/usr/bin/env python3
"""
PCHelper — MCP-сервер (MVP).

Протокол Model Context Protocol позволяет AI-ассистенту (LLM) работать
с внешней системой через три вида примитивов:

    Tools      — действия, которые агент может совершать;
    Resources  — данные, которые агент может прочитать;
    Prompts    — шаблоны сообщений для типовых сценариев.

Требования задания 5, которые реализованы в этом файле:

 1. Сервер предоставляет Resource ``pchelper://orders/recent``, который LLM
    читает, чтобы ответить пользователю «ваш заказ ещё в пути».
 2. Tool ``track_order`` требует строгого указания ``tracking_number``,
    которое LLM берёт из прочитанного ресурса.
 3. Валидация: агент не может отменить уже доставленный заказ —
    ограничение закреплено в ``services.cancel_order`` и не обходится
    никакими аргументами инструмента.
 4. Логирование действий агента — модуль ``audit`` (маскирование PII).

Запуск
------

    # stdio (Claude Desktop, Cursor)
    python server.py

    # streamable HTTP (MCP Inspector, удалённый запуск)
    python server.py --http

    # сбросить mock-базу
    python server.py --reset
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Any, Literal

from mcp.server.fastmcp import FastMCP

import audit
import services
from db import COMPONENT_TYPES, ORDER_STATUSES, init_db

#: Идентификатор агента для журнала действий.
AGENT = os.getenv("PCHELPER_AGENT_NAME", "claude-desktop")

mcp = FastMCP(
    name="pchelper",
    instructions=(
        "Сервер интернет-магазина компьютерных комплектующих PCHelper. "
        "Позволяет подобрать совместимую сборку ПК, оформить заказ и отследить его статус. "
        "Перед действиями, требующими данных о заказе (трек-номер, сумма возврата), "
        "сначала прочитай соответствующий ресурс pchelper://, а затем вызови инструмент."
    ),
)

ComponentType = Literal["cpu", "motherboard", "ram", "cooling", "gpu", "storage", "psu", "case"]


# =====================================================================
#  TOOLS — действия агента (13 инструментов)
# =====================================================================


@mcp.tool()
def search_components(
    component_type: ComponentType | None = None,
    brand: str | None = None,
    query: str | None = None,
    min_price: int | None = None,
    max_price: int | None = None,
    sort: Literal["price_asc", "price_desc", "name"] = "price_asc",
    limit: int = 20,
) -> list[dict[str, Any]]:
    """
    Ищет комплектующие в каталоге PCHelper.

    Используй этот инструмент, чтобы предложить покупателю конкретную модель.
    Цены указаны в белорусских рублях (BYN).

    Args:
        component_type: Тип компонента: cpu, motherboard, ram, cooling,
            gpu, storage, psu, case. Если не задан — поиск по всем типам.
        brand: Фильтр по производителю (частичное совпадение), например «AMD».
        query: Поиск по названию, например «Kingston».
        min_price: Минимальная цена в BYN.
        max_price: Максимальная цена в BYN.
        sort: Порядок сортировки: price_asc, price_desc, name.
        limit: Сколько позиций вернуть (1…100).

    Returns:
        Список товаров: идентификатор, название, цена, характеристики.
    """
    with audit.audit(AGENT, "search_components",
                     {"component_type": component_type, "brand": brand, "max_price": max_price}) as ctx:
        items = services.search_components(component_type, brand, query, min_price, max_price, sort, limit)
        ctx["result"] = f"Найдено {len(items)} позиций"
        return items


@mcp.tool()
def get_component(component_type: ComponentType, component_id: int) -> dict[str, Any]:
    """
    Возвращает карточку компонента по идентификатору и типу.

    Args:
        component_type: Тип компонента (обязателен: идентификаторы
            в разных таблицах каталога независимы).
        component_id: Идентификатор компонента в каталоге.

    Returns:
        Полная карточка товара вместе с остатком на складе.
    """
    with audit.audit(AGENT, "get_component", {"component_type": component_type, "component_id": component_id}) as ctx:
        item = services.get_component(component_type, component_id)
        ctx["result"] = item.get("название")
        return item


@mcp.tool()
def check_compatibility(
    cpu_id: int,
    motherboard_id: int,
    ram_id: int,
    cooling_id: int | None = None,
    gpu_id: int | None = None,
    storage_ids: list[int] | None = None,
    psu_id: int | None = None,
    case_id: int | None = None,
) -> dict[str, Any]:
    """
    Проверяет совместимость конфигурации ПК по 8 правилам.

    Правила: сокет CPU и платы; тип памяти; иерархия форм-факторов;
    длина видеокарты; TDP охлаждения; высота кулера и длина радиатора СЖО;
    мощность БП с запасом 25 %; ровно один SSD и не более одного HDD.

    Args:
        cpu_id: Идентификатор процессора.
        motherboard_id: Идентификатор материнской платы.
        ram_id: Идентификатор модуля ОЗУ.
        cooling_id: Идентификатор системы охлаждения.
        gpu_id: Идентификатор видеокарты (необязательно для iGPU-сборок).
        storage_ids: Список идентификаторов накопителей.
        psu_id: Идентификатор блока питания.
        case_id: Идентификатор корпуса.

    Returns:
        compatible (bool), errors, warnings, totalPrice, requiredPsuWatts.
    """
    args = {"cpu_id": cpu_id, "motherboard_id": motherboard_id, "ram_id": ram_id,
            "cooling_id": cooling_id, "gpu_id": gpu_id, "storage_ids": storage_ids or [],
            "psu_id": psu_id, "case_id": case_id}
    with audit.audit(AGENT, "check_compatibility", args) as ctx:
        result = services.check_compatibility(cpu_id, motherboard_id, ram_id,
                                             cooling_id, gpu_id, storage_ids, psu_id, case_id)
        ctx["result"] = "совместима" if result["compatible"] else f"ошибок: {len(result['errors'])}"
        ctx["status"] = 200 if result["compatible"] else 422
        return result


@mcp.tool()
def recommend_psu(cpu_id: int, gpu_id: int | None = None, headroom: float = 1.25) -> dict[str, Any]:
    """
    Подбирает блок питания по TDP процессора и видеокарты.

    Рекомендуемая мощность = ceil((TDP CPU + TDP GPU) × запас),
    где запас по умолчанию равен 1.25 (25 %).

    Args:
        cpu_id: Идентификатор процессора.
        gpu_id: Идентификатор видеокарты (необязательно).
        headroom: Коэффициент запаса, по умолчанию 1.25.

    Returns:
        recommendedWatts, recommendedWattageClass и список подходящих БП.
    """
    with audit.audit(AGENT, "recommend_psu", {"cpu_id": cpu_id, "gpu_id": gpu_id}) as ctx:
        result = services.recommend_psu(cpu_id, gpu_id, headroom)
        ctx["result"] = f"{result['recommendedWatts']} Вт"
        return result


@mcp.tool()
def get_cart(user_id: int) -> dict[str, Any]:
    """
    Возвращает корзину покупателя.

    Args:
        user_id: Идентификатор покупателя.

    Returns:
        Список позиций, общее количество и итоговую стоимость в BYN.
    """
    with audit.audit(AGENT, "get_cart", {"user_id": user_id}) as ctx:
        cart = services.get_cart(user_id)
        ctx["result"] = f"позиций: {len(cart['items'])}, сумма {cart['totalPrice']}"
        return cart


@mcp.tool()
def add_to_cart(user_id: int, component_type: ComponentType, component_id: int, quantity: int = 1) -> dict[str, Any]:
    """
    Добавляет товар в корзину покупателя.

    Args:
        user_id: Идентификатор покупателя.
        component_type: Тип компонента.
        component_id: Идентификатор компонента.
        quantity: Количество, от 1 до 10.

    Returns:
        Обновлённая корзина. При нехватке товара возвращается ошибка.
    """
    args = {"user_id": user_id, "component_type": component_type,
            "component_id": component_id, "quantity": quantity}
    with audit.audit(AGENT, "add_to_cart", args) as ctx:
        cart = services.add_to_cart(user_id, component_type, component_id, quantity)
        ctx["result"] = f"позиций: {len(cart['items'])}"
        return cart


@mcp.tool()
def apply_promo_code(user_id: int, code: str) -> dict[str, Any]:
    """
    Проверяет промокод и рассчитывает скидку на текущую корзину.

    Перед вызовом прочитай ресурс ``pchelper://promo/active`` —
    там перечислены действующие промокоды и их условия.

    Args:
        user_id: Идентификатор покупателя.
        code: Код промокода, например PCH5.

    Returns:
        Размер скидки и итоговую стоимость корзины.
    """
    with audit.audit(AGENT, "apply_promo_code", {"user_id": user_id, "code": code}) as ctx:
        result = services.apply_promo_code(user_id, code)
        ctx["result"] = f"скидка {result['discount']} BYN"
        return result


@mcp.tool()
def create_order(
    user_id: int,
    phone: str,
    delivery_method: Literal["courier", "pickup", "mail"] = "courier",
    payment_method: Literal["card", "cash", "installment", "credit"] = "card",
    address: str | None = None,
    promo_code: str | None = None,
) -> dict[str, Any]:
    """
    Оформляет заказ из корзины покупателя.

    Порядок действий на сервере: проверка остатков → фиксация снимка
    названий и цен → применение промокода → резерв товара → очистка корзины.

    Args:
        user_id: Идентификатор покупателя.
        phone: Телефон для связи.
        delivery_method: Способ доставки: courier, pickup, mail.
        payment_method: Способ оплаты: card, cash, installment, credit.
        address: Адрес доставки (обязателен для courier и mail).
        promo_code: Промокод, если есть.

    Returns:
        Созданный заказ с номером, статусом «Новый» и позициями.
    """
    args = {"user_id": user_id, "phone": phone, "delivery_method": delivery_method,
            "payment_method": payment_method, "address": address, "promo_code": promo_code}
    with audit.audit(AGENT, "create_order", args) as ctx:
        order = services.create_order(user_id, delivery_method, phone, payment_method, address, promo_code)
        ctx["result"] = order["номер"]
        ctx["status"] = 201
        return order


@mcp.tool()
def list_orders(user_id: int | None = None, status: str | None = None, limit: int = 20) -> list[dict[str, Any]]:
    """
    Возвращает список заказов: конкретного покупателя либо все (для менеджера).

    Args:
        user_id: Идентификатор покупателя; None — все заказы.
        status: Фильтр по статусу: Новый, В обработке, Собран,
            Отправлен, Доставлен, Отменён.
        limit: Сколько заказов вернуть.

    Returns:
        Список заказов.
    """
    with audit.audit(AGENT, "list_orders", {"user_id": user_id, "status": status}) as ctx:
        orders = services.list_orders(user_id, status, limit)
        ctx["result"] = f"заказов: {len(orders)}"
        return orders


@mcp.tool()
def track_order(order_id: int, tracking_number: str) -> dict[str, Any]:
    """
    Возвращает статус доставки заказа.

    ВАЖНО: параметр ``tracking_number`` обязателен и должен точно
    совпадать с трек-номером из ресурса ``pchelper://orders/recent``.
    Сначала прочитай ресурс, затем вызывай инструмент.

    Args:
        order_id: Идентификатор заказа.
        tracking_number: Трек-номер из ресурса pchelper://orders/recent.

    Returns:
        Номер заказа, трек-номер, статус и перевозчик.
    """
    with audit.audit(AGENT, "track_order", {"order_id": order_id}) as ctx:
        result = services.track_order(order_id, tracking_number)
        ctx["result"] = result["status"]
        return result


@mcp.tool()
def cancel_order(order_id: int, reason: str, user_id: int | None = None) -> dict[str, Any]:
    """
    Отменяет заказ покупателя.

    Ограничение бизнес-логики: отменить можно только заказ в статусе
    «Новый» или «В обработке». Заказ в статусе «Собран», «Отправлен»
    или «Доставлен» отменить нельзя — сервер вернёт ошибку с пояснением.

    Args:
        order_id: Идентификатор заказа.
        reason: Причина отмены (1–500 символов).
        user_id: Идентификатор покупателя (дополнительная проверка прав).

    Returns:
        Заказ со статусом «Отменён».
    """
    args = {"order_id": order_id, "reason": reason, "user_id": user_id}
    with audit.audit(AGENT, "cancel_order", args) as ctx:
        order = services.cancel_order(order_id, reason, user_id)
        ctx["result"] = "Отменён"
        return order


@mcp.tool()
def set_order_status(order_id: int, status: str, comment: str | None = None) -> dict[str, Any]:
    """
    Меняет статус заказа. Предназначен для менеджера.

    Переход проверяется по справочнику разрешённых переходов.
    При переходе в статус «Отправлен» сервер автоматически присваивает
    заказу трек-номер.

    Args:
        order_id: Идентификатор заказа.
        status: Новый статус: Новый, В обработке, Собран, Отправлен,
            Доставлен, Отменён.
        comment: Комментарий менеджера для покупателя.

    Returns:
        Обновлённый заказ.
    """
    with audit.audit(AGENT, "set_order_status", {"order_id": order_id, "status": status}) as ctx:
        order = services.set_order_status(order_id, status, comment)
        ctx["result"] = order["статус"]
        return order


@mcp.tool()
def check_stock(
    component_type: ComponentType | None = None,
    component_id: int | None = None,
    only_low: bool = False,
    limit: int = 50,
) -> list[dict[str, Any]]:
    """
    Проверяет остатки товара на складе.

    Args:
        component_type: Тип компонента; None — по всем типам.
        component_id: Идентификатор компонента.
        only_low: Если true — вернуть только позиции, заканчивающиеся.
        limit: Сколько позиций вернуть.

    Returns:
        Список остатков: количество, зарезервировано, доступно.
    """
    with audit.audit(AGENT, "check_stock", {"component_type": component_type, "only_low": only_low}) as ctx:
        rows = services.check_stock(component_type, component_id, only_low, limit)
        ctx["result"] = f"позиций: {len(rows)}"
        return rows


# =====================================================================
#  RESOURCES — читаемые данные (9 ресурсов)
# =====================================================================


@mcp.resource("pchelper://catalog/{component_type}")
def resource_catalog(component_type: str) -> str:
    """Каталог комплектующих по типу. Примеры URI: pchelper://catalog/cpu, pchelper://catalog/gpu."""
    if component_type not in COMPONENT_TYPES:
        return json.dumps({"error": f"Неизвестный тип «{component_type}». Допустимые: {list(COMPONENT_TYPES)}"},
                          ensure_ascii=False)
    items = services.search_components(component_type=component_type, limit=100)
    audit.log_action(AGENT, f"resource:catalog/{component_type}", {}, f"{len(items)} позиций")
    return json.dumps(items, ensure_ascii=False, indent=2)


@mcp.resource("pchelper://compatibility/rules")
def resource_rules() -> str:
    """Текстовые правила совместимости. Прочитай их перед подбором комплектующих."""
    audit.log_action(AGENT, "resource:compatibility/rules", {}, "8 правил")
    return """# Правила совместимости PCHelper

1. **Сокет.** Сокет процессора должен совпадать с сокетом материнской платы.
2. **Тип памяти.** Тип памяти платы (DDR4/DDR5) должен совпадать с типом модуля ОЗУ.
3. **Форм-фактор.** Иерархия: Mini-ITX < Micro-ATX < ATX < E-ATX.
   Корпус должен быть не меньше платы.
4. **Длина видеокарты.** Длина карты (мм) не должна превышать максимум корпуса.
5. **Охлаждение по TDP.** TDP системы охлаждения должно быть не меньше TDP процессора.
6. **Габариты охлаждения.** Воздушный кулер по высоте, СЖО — по длине радиатора.
7. **Блок питания.** Мощность БП ≥ ceil((TDP CPU + TDP GPU) × 1.25), то есть запас 25 %.
8. **Накопители.** В сборке ровно один SSD и не более одного HDD.

Итоговая стоимость сборки — сумма цен всех выбранных компонентов.
Все цены в белорусских рублях (BYN).
"""


@mcp.resource("pchelper://orders/recent")
def resource_orders_recent() -> str:
    """
    Последние заказы с трек-номерами.

    LLM читает этот ресурс, чтобы ответить на вопрос
    «где мой заказ», и берёт отсюда tracking_number
    для вызова инструмента track_order.
    """
    orders = services.list_orders(limit=10)
    audit.log_action(AGENT, "resource:orders/recent", {}, f"{len(orders)} заказов")
    return json.dumps(orders, ensure_ascii=False, indent=2)


@mcp.resource("pchelper://users/{user_id}/orders")
def resource_user_orders(user_id: str) -> str:
    """История заказов конкретного покупателя. Пример: pchelper://users/1/orders."""
    orders = services.list_orders(user_id=int(user_id), limit=50)
    audit.log_action(AGENT, f"resource:users/{user_id}/orders", {"user_id": user_id}, f"{len(orders)} заказов")
    return json.dumps(orders, ensure_ascii=False, indent=2)


@mcp.resource("pchelper://users/{user_id}/cart")
def resource_user_cart(user_id: str) -> str:
    """Корзина покупателя. Пример: pchelper://users/1/cart."""
    cart = services.get_cart(int(user_id))
    audit.log_action(AGENT, f"resource:users/{user_id}/cart", {"user_id": user_id}, "корзина")
    return json.dumps(cart, ensure_ascii=False, indent=2)


@mcp.resource("pchelper://users/{user_id}/builds")
def resource_user_builds(user_id: str) -> str:
    """Сохранённые сборки покупателя (MVP — из корзины и истории заказов)."""
    orders = services.list_orders(user_id=int(user_id), limit=10)
    builds = [
        {"orderNumber": o["номер"], "статус": o["статус"], "позиции": o["статус"], "итог": o["итоговая_сумма"]}
        for o in orders
    ]
    audit.log_action(AGENT, f"resource:users/{user_id}/builds", {"user_id": user_id}, f"{len(builds)} сборок")
    return json.dumps(builds, ensure_ascii=False, indent=2)


@mcp.resource("pchelper://policies/refund")
def resource_refund_policy() -> str:
    """Правила возврата и промокодов. Обязательно к прочтению перед расчётом возврата."""
    audit.log_action(AGENT, "resource:policies/refund", {}, "правила возврата")
    return """# Правила возврата и промокодов PCHelper

## Промокоды
| Код | Тип скидки | Размер | Минимальная сумма |
|-----|------------|--------|-------------------|
| PCH5 | процент | 5 % | 500 BYN |
| SPRING | процент | 10 % | 2 000 BYN |
| FREESHIP | фиксированная | 25 BYN | 100 BYN |

## Возврат
* Заказ в статусе «Новый» или «В обработке» отменяется покупателем
  самостоятельно через инструмент `cancel_order`, возврат 100 % суммы.
* Заказ в статусе «Собран» отмене не подлежит, но возможен частичный возврат
  при некомплектности — до 30 % стоимости позиции.
* Заказ в статусе «Отправлен» или «Доставлен» отменить нельзя.
  Возврат оформляется через службу поддержки в течение 14 дней,
  сумма рассчитывается как стоимость позиции за вычетом 15 % комиссии.
* Стоимость доставки при возврате не возмещается, если заказ уже доставлен.

## Формула
    сумма_возврата = цена_за_единицу × количество − комиссия

Все расчёты выполняются в белорусских рублях (BYN).
"""


@mcp.resource("pchelper://audit/recent")
def resource_audit_recent() -> str:
    """Журнал действий агента: что, кто и когда вызывал."""
    rows = audit.recent_actions(50)
    return json.dumps(rows, ensure_ascii=False, indent=2)


@mcp.resource("pchelper://statuses")
def resource_statuses() -> str:
    """Справочник статусов заказа и разрешённых переходов."""
    audit.log_action(AGENT, "resource:statuses", {}, "справочник статусов")
    return json.dumps({
        "статусы": list(ORDER_STATUSES),
        "жизненный_цикл": "Новый → В обработке → Собран → Отправлен → Доставлен",
        "отменяемые_из": ["Новый", "В обработке"],
        "неотменяемые": ["Собран", "Отправлен", "Доставлен"],
    }, ensure_ascii=False, indent=2)


# =====================================================================
#  PROMPTS — шаблоны сценариев (5 промптов)
# =====================================================================


@mcp.prompt()
def assemble_pc(budget: float, task: str = "Игры") -> str:
    """
    Подбирает совместимую сборку ПК под бюджет и задачи.

    Args:
        budget: Бюджет в белорусских рублях (BYN).
        task: Назначение: Игры, Офис, Учёба, Дизайн, Видеомонтаж.
    """
    return f"""Пользователь хочет собрать ПК для задачи «{task}» с бюджетом {budget:.0f} BYN.

Выполни строго по шагам, не перескакивай:
1. Прочитай ресурс pchelper://compatibility/rules — соблюдай все 8 правил.
2. Прочитай ресурс pchelper://catalog/cpu и pchelper://catalog/gpu.
3. Подбери процессор и видеокарту, укладывающиеся примерно в 60 % бюджета.
4. Подбери остальные компоненты (плата, ОЗУ, охлаждение, накопитель, БП, корпус).
5. Вызови check_compatibility с полным набором идентификаторов.
6. Если есть блокирующие ошибки — исправь конфигурацию и проверь заново.
7. Вызови recommend_psu и убедись, что блок питания соответствует расчёту.
8. Вызови check_stock — предупреди пользователя, если товара не хватает.
9. В финальном ответе перечисли сборку позициями, укажи общую стоимость,
   оставшийся запас бюджета и предупреждения (warnings).

Бюджет: {budget:.0f} BYN. Задача: {task}.
"""


@mcp.prompt()
def check_build(cpu_id: int, motherboard_id: int, ram_id: int, gpu_id: int | None = None,
                storage_ids: list[int] | None = None, psu_id: int | None = None,
                cooling_id: int | None = None, case_id: int | None = None) -> str:
    """
    Проверяет готовую сборку пользователя на совместимость.

    Args:
        cpu_id: Идентификатор процессора.
        motherboard_id: Идентификатор материнской платы.
        ram_id: Идентификатор ОЗУ.
        gpu_id: Идентификатор видеокарты.
        storage_ids: Список идентификаторов накопителей.
        psu_id: Идентификатор блока питания.
        cooling_id: Идентификатор охлаждения.
        case_id: Идентификатор корпуса.
    """
    return f"""Проверь сборку пользователя на совместимость.

Состав сборки: cpu={cpu_id}, motherboard={motherboard_id}, ram={ram_id},
gpu={gpu_id}, storage={storage_ids}, psu={psu_id}, cooling={cooling_id}, case={case_id}.

Порядок действий:
1. Прочитай ресурс pchelper://compatibility/rules.
2. Вызови check_compatibility с указанными идентификаторами.
3. Объясни каждую блокирующую ошибку понятным языком и предложи,
   какой компонент нужно заменить (назови конкретную модель из каталога).
4. Отдельно перечисли предупреждения (warnings) — они не мешают сборке.
"""


@mcp.prompt()
def order_refund(order_id: int) -> str:
    """
    Рассчитывает возврат по заказу. СНАЧАЛА читает правила возврата.

    Args:
        order_id: Идентификатор заказа.
    """
    return f"""Пользователь просит рассчитать возврат по заказу № {order_id}.

Строго соблюдай порядок:
1. СНАЧАЛА прочитай ресурс pchelper://policies/refund — правила возврата
   и промокодов. Не начинай расчёт, пока не прочитал его.
2. Прочитай ресурс pchelper://orders/recent и найди заказ № {order_id}.
3. Определи статус заказа и применимое правило:
   «Новый»/«В обработке» → 100 % суммы;
   «Собран» → частичный возврат до 30 % позиции;
   «Отправлен»/«Доставлен» → только через поддержку, комиссия 15 %.
4. Посчитай сумму возврата по формуле из правил.
5. Если статус позволяет самостоятельную отмену — предложи вызвать
   cancel_order, но только после явного подтверждения пользователя.
6. Если отмена запрещена — прямо скажи об этом и предложи обращение в поддержку.
Не выдумывай суммы: используй только данные заказа из ресурса.
"""


@mcp.prompt()
def order_status_report(user_id: int) -> str:
    """
    Формирует отчёт о статусе заказов покупателя.

    Args:
        user_id: Идентификатор покупателя.
    """
    return f"""Составь краткий отчёт о заказах пользователя № {user_id}.

1. Прочитай ресурс pchelper://users/{user_id}/orders.
2. Для каждого заказа укажи номер, статус, дату и сумму.
3. Если у заказа есть трек-номер, прочитай ресурс pchelper://orders/recent
   и вызови track_order с точным значением tracking_number из него.
4. Отдельно выдели заказы, требующие внимания (в обработке дольше суток).
5. Не задавай уточняющих вопросов, на которые есть ответ в ресурсах.
"""


@mcp.prompt()
def manager_daily_digest() -> str:
    """Формирует ежедневную сводку для менеджера: заказы и остатки."""
    return """Подготовь ежедневную сводку для менеджера магазина PCHelper.

1. Прочитай ресурс pchelper://orders/recent.
2. Вызови check_stock(only_low=true) — найди позиции, которые заканчиваются.
3. Отдельно выдели заказы в статусе «Новый», которые ещё не взяты в обработку,
   и заказы в статусе «Отправлен» без трек-номера.
4. При необходимости изменить статус заказа используй set_order_status,
   но только для допустимых переходов.
5. Выведи сводку в три блока: «Требует действий», «Скоро закончится», «В пути».
   Объём — не более 15 строк, формат — для чтения с телефона.
"""


# =====================================================================
#  Точка входа
# =====================================================================


def main() -> None:
    """Точка входа MCP-сервера.

    Разбор аргументов командной строки:
      --reset  пересоздать mock-базу из schema.sql и seed.sql;
      --http   запуск через Streamable HTTP вместо stdio
              (нужен для MCP Inspector и для контейнера);
      --host / --port  адрес и порт для HTTP-режима.

    Без аргументов запускается stdio-транспорт — так сервер
    подключается к Claude Desktop и Cursor как дочерний процесс.
    """
    parser = argparse.ArgumentParser(description="MCP-сервер PCHelper")
    parser.add_argument("--http", action="store_true", help="запуск через Streamable HTTP вместо stdio")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8080)
    parser.add_argument("--reset", action="store_true", help="пересоздать mock-базу")
    args = parser.parse_args()

    if args.reset or not os.path.exists(os.getenv("PCHELPER_DB", "pchelper_mcp.db")):
        path = init_db(reset=args.reset)
        print(f"[PCHelper MCP] mock-база готова: {path}", file=sys.stderr)

    if args.http:
        mcp.settings.host = args.host
        mcp.settings.port = args.port
        mcp.run(transport="streamable-http")
    else:
        mcp.run()  # stdio — для Claude Desktop и Cursor


if __name__ == "__main__":
    main()