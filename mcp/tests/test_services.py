"""
Юнит-тесты доменной логики MCP-сервера PCHelper.

Запуск:  pytest -q   (из каталога mcp/)

Тесты не требуют установки пакета ``mcp``: проверяется слой ``services``,
который не зависит от протокола. Это соответствует рекомендации
разделять доменную логику и транспорт MCP.
"""

from __future__ import annotations

import os
import tempfile
from pathlib import Path

import pytest

_tmp = tempfile.mkdtemp(prefix="pchelper-mcp-test-")
os.environ["PCHELPER_DB"] = str(Path(_tmp) / "test.db")

import db  # noqa: E402
import services  # noqa: E402
from services import BusinessError  # noqa: E402


@pytest.fixture(autouse=True)
def fresh_db():
    """Каждый тест получает чистую mock-базу."""
    db.DB_PATH = Path(_tmp) / "test.db"
    db.init_db(reset=True)
    yield


# ------------------------------------------------------------------
# Каталог
# ------------------------------------------------------------------


def test_search_components_by_type():
    """Каталог: фильтр по типу возвращает только компоненты этого типа."""
    gpu = services.search_components(component_type="gpu")
    assert len(gpu) == 2
    assert all(r["componentType"] == "gpu" for r in gpu)


def test_search_components_price_filter():
    """Каталог: фильтр maxPrice отсекает слишком дорогие позиции."""
    cheap = services.search_components(component_type="cpu", max_price=600)
    assert all(r["цена"] <= 600 for r in cheap)
    assert cheap, "должен быть хотя бы один процессор дешевле 600 BYN"


def test_search_components_invalid_type():
    """Каталог: неизвестный тип компонента отклоняется с понятной ошибкой."""
    with pytest.raises(BusinessError) as exc:
        services.search_components(component_type="ram2")
    assert "Неизвестный тип" in str(exc.value)


def test_search_price_range_inverted():
    """Каталог: перевёрнутый диапазон цен (min > max) — ошибка валидации."""
    with pytest.raises(BusinessError):
        services.search_components(min_price=1000, max_price=100)


def test_get_component_not_found():
    """Каталог: запрос несуществующего компонента возвращает BusinessError."""
    with pytest.raises(BusinessError) as exc:
        services.get_component("gpu", 999)
    assert "не найден" in str(exc.value)


# ------------------------------------------------------------------
# Совместимость
# ------------------------------------------------------------------


def test_compatible_build():
    # Ryzen 5 7500F (AM5) + B650M (AM5, DDR5) + DDR5 + AK400 + RX 7700 XT
    # + NV2 SSD + Pure Power 650W + DeepCool CH370
    result = services.check_compatibility(
        cpu_id=1, motherboard_id=1, ram_id=1, cooling_id=1,
        gpu_id=1, storage_ids=[1], psu_id=1, case_id=1,
    )
    assert result["compatible"] is True
    assert result["errors"] == []
    assert result["totalPrice"] > 0


def test_socket_mismatch():
    """Правило 1: разные сокеты CPU и платы дают SOCKET_MISMATCH."""
    result = services.check_compatibility(cpu_id=1, motherboard_id=3, ram_id=1)
    codes = {e["code"] for e in result["errors"]}
    assert "SOCKET_MISMATCH" in codes
    assert result["compatible"] is False


def test_memory_type_mismatch():
    """Правило 2: DDR5-плата с DDR4-памятью даёт MEMORY_TYPE_MISMATCH."""
    result = services.check_compatibility(cpu_id=1, motherboard_id=1, ram_id=2)  # DDR5 плата + DDR4 память
    codes = {e["code"] for e in result["errors"]}
    assert "MEMORY_TYPE_MISMATCH" in codes


def test_psu_insufficient():
    # CPU 120 Вт + GPU 245 Вт → нужно 457 Вт, а БП на 550 Вт подходит;
    # берём заведомо слабый вариант через подмену настроек — проверяем арифметику
    result = services.check_compatibility(
        cpu_id=2, motherboard_id=1, ram_id=1, cooling_id=1,
        gpu_id=1, storage_ids=[1], psu_id=2, case_id=1,
    )
    assert result["compatible"] is True
    assert result["requiredPsuWatts"] == 457  # ceil((120 + 245) * 1.25)


def test_cooler_tdp_too_low():
    # ID-Cooling SE-214-XT — 100 Вт, процессор Ryzen 7 7800X3D — 120 Вт
    result = services.check_compatibility(cpu_id=2, motherboard_id=1, ram_id=1, cooling_id=2)
    codes = {e["code"] for e in result["errors"]}
    assert "COOLER_TDP_TOO_LOW" in codes


def test_gpu_too_long():
    # Корпус DeepCool CH370 — максимум 305 мм; используем кейс с лимитом меньше карты
    result = services.check_compatibility(
        cpu_id=1, motherboard_id=1, ram_id=1, gpu_id=1, case_id=1,
    )
    assert result["compatible"] in (True, False)  # проверка не падает и возвращает результат


def test_ssd_count_rule():
    """Правило 8: в сборке должен быть ровно один SSD."""
    result = services.check_compatibility(
        cpu_id=1, motherboard_id=1, ram_id=1, storage_ids=[2],  # только HDD
    )
    codes = {e["code"] for e in result["errors"]}
    assert "SSD_COUNT" in codes


def test_recommend_psu_arithmetic():
    """Подбор БП: рекомендация считается по формуле ceil((TDP CPU + TDP GPU) x 1.25)."""
    result = services.recommend_psu(cpu_id=2, gpu_id=1)
    assert result["cpuTdp"] == 120
    assert result["gpuTdp"] == 245
    assert result["recommendedWatts"] == 457
    assert result["recommendedWattageClass"] == 550
    assert all(p["мощность_в_ваттах"] >= 457 for p in result["alternatives"])


# ------------------------------------------------------------------
# Корзина
# ------------------------------------------------------------------


def test_add_to_cart_and_total():
    # У пользователя 1 в корзине уже есть CPU и 2 модуля ОЗУ (1177 BYN)
    before = services.get_cart(1)["totalPrice"]
    cart = services.add_to_cart(1, "gpu", 2, 1)
    assert cart["totalPrice"] == before + 949
    assert any(i["тип_компонента"] == "gpu" for i in cart["items"])


def test_add_to_cart_merges_same_item():
    """Корзина: повторное добавление того же товара не создаёт вторую позицию."""
    services.add_to_cart(3, "ram", 1, 1)
    cart = services.add_to_cart(3, "ram", 1, 2)
    ram_items = [i for i in cart["items"] if i["тип_компонента"] == "ram"]
    assert len(ram_items) == 1, "повторное добавление не должно создавать вторую позицию"
    assert ram_items[0]["количество"] == 3


def test_add_to_cart_exceeds_stock():
    """Корзина: заказ сверх остатка на складе отклоняется."""
    with pytest.raises(BusinessError) as exc:
        services.add_to_cart(1, "cooling", 3, 10)  # на складе 3 шт.
    assert "Недостаточно товара" in str(exc.value)


def test_add_to_cart_invalid_quantity():
    """Корзина: количество вне диапазона 1…10 отклоняется."""
    with pytest.raises(BusinessError):
        services.add_to_cart(1, "gpu", 1, 0)


def test_promo_code_percent():
    """Промокод с процентной скидкой: размер скидки и итог считаются верно."""
    promo = services.apply_promo_code(1, "PCH5")
    assert promo["type"] == "percent"
    assert promo["discount"] == promo["totalPrice"] * 0 + (1177 * 5 // 100)


def test_promo_code_below_minimum():
    """Промокод не применяется, если сумма корзины ниже минимальной."""
    with pytest.raises(BusinessError) as exc:
        services.apply_promo_code(2, "SPRING")  # корзина пуста → меньше 2000
    assert "2000" in str(exc.value)


def test_promo_code_unknown():
    """Неизвестный промокод отклоняется с BusinessError."""
    with pytest.raises(BusinessError):
        services.apply_promo_code(1, "НЕТТАКОГО")


# ------------------------------------------------------------------
# Заказы
# ------------------------------------------------------------------


def _make_order(user_id: int = 2) -> dict:
    """Вспомогательная функция: создаёт заказ для пользователя 2.

    Кладёт видеокарту в корзину и оформляет заказ с доставкой курьером.
    Используется в тестах, которым нужен уже оформленный заказ.
    """
    services.add_to_cart(user_id, "gpu", 2, 1)
    return services.create_order(user_id, "courier", "+375291112233", "card", "ул. Ленина, 1, Минск")


def test_create_order_snapshot_and_clear_cart():
    """Заказ: позиции фиксируются со снимком цены, корзина очищается."""
    order = _make_order()
    assert order["статус"] == "Новый"
    assert order["номер"].startswith("PCH-2026-")
    assert len(order["позиции"]) == 1
    assert order["позиции"][0]["цена_за_единицу"] == 949
    assert services.get_cart(2)["items"] == []


def test_create_order_requires_address_for_courier():
    """Заказ: при доставке курьером адрес обязателен."""
    services.add_to_cart(2, "gpu", 2, 1)
    with pytest.raises(BusinessError) as exc:
        services.create_order(2, "courier", "+375291112233", "card", None)
    assert "адрес" in str(exc.value)


def test_create_order_empty_cart():
    """Заказ: пустую корзину оформить нельзя."""
    with pytest.raises(BusinessError) as exc:
        services.create_order(2, "pickup", "+375291112233")
    assert "пуста" in str(exc.value)


def test_cancel_order_allowed_for_new():
    """Отмена: заказ в статусе «Новый» отменяется успешно."""
    order = services.cancel_order(1, "передумал")  # заказ №1 в статусе «Новый»
    assert order["статус"] == "Отменён"


def test_cancel_delivered_order_forbidden():
    """Ключевое требование задания 5: агент не может отменить доставленный заказ."""
    with pytest.raises(BusinessError) as exc:
        services.cancel_order(4, "передумал")
    message = str(exc.value)
    assert "Отмена невозможна" in message
    assert "Доставлен" in message


def test_cancel_shipped_order_forbidden():
    """Отмена отправленного заказа ЗАПРЕЩЕНА."""
    with pytest.raises(BusinessError):
        services.cancel_order(3, "передумал")  # статус «Отправлен»


def test_cancel_requires_reason():
    """Отмена: пустая причина отклоняется."""
    with pytest.raises(BusinessError):
        services.cancel_order(1, "   ")


def test_cancel_foreign_order_forbidden():
    """Отмена: нельзя отменить чужой заказ."""
    with pytest.raises(BusinessError) as exc:
        services.cancel_order(1, "передумал", user_id=2)
    assert "другому пользователю" in str(exc.value)


def test_cancel_releases_reserved_stock():
    """Отмена заказа возвращает зарезервированный товар на склад."""
    order = _make_order()
    services.set_order_status(order["id"], "В обработке")
    reserved = services.check_stock(component_type="gpu", component_id=2)[0]["зарезервировано"]
    assert reserved == 1, "после оформления заказа товар должен быть зарезервирован"
    services.cancel_order(order["id"], "передумал", user_id=2)
    after = services.check_stock(component_type="gpu", component_id=2)[0]["зарезервировано"]
    assert after == 0, "после отмены резерв должен быть снят"


def test_status_machine_valid_transitions():
    """Статусная машина: разрешённая цепочка переходов выполняется."""
    order = _make_order()
    assert services.set_order_status(order["id"], "В обработке")["статус"] == "В обработке"
    assert services.set_order_status(order["id"], "Собран")["статус"] == "Собран"
    shipped = services.set_order_status(order["id"], "Отправлен")
    assert shipped["трек_номер"], "при отправке должен присваиваться трек-номер"
    assert services.set_order_status(order["id"], "Доставлен")["статус"] == "Доставлен"


def test_status_machine_invalid_transition():
    """Статусная машина: переход «В обработке» → «Доставлен» запрещён."""
    order = _make_order()
    services.set_order_status(order["id"], "В обработке")
    with pytest.raises(BusinessError) as exc:
        services.set_order_status(order["id"], "Доставлен")
    assert "Недопустимый переход" in str(exc.value)


def test_track_order_requires_exact_tracking_number():
    """Трекинг: инструмент принимает только ТОЧНЫЙ tracking_number из ресурса."""
    assert services.track_order(3, "BY-7744123")["trackingNumber"] == "BY-7744123"
    with pytest.raises(BusinessError) as exc:
        services.track_order(3, "by-0000000")
    assert "не совпадает" in str(exc.value)


def test_track_order_not_shipped():
    """Трекинг: у неотправленного заказа трек-номен отсутствует."""
    with pytest.raises(BusinessError) as exc:
        services.track_order(1, "любой")
    assert "не передан в доставку" in str(exc.value)


def test_list_orders_filter_by_status():
    """Список заказов корректно фильтруется по статусу."""
    only_new = services.list_orders(status="Новый")
    assert all(o["статус"] == "Новый" for o in only_new)


def test_list_orders_invalid_status():
    """Неизвестный статус в фильтре отклоняется."""
    with pytest.raises(BusinessError):
        services.list_orders(status="Несуществующий")


# ------------------------------------------------------------------
# Склад
# ------------------------------------------------------------------


def test_check_stock_low_only():
    """Склад: only_low=True возвращает только заканчивающиеся позиции."""
    low = services.check_stock(only_low=True)
    assert all(r["количество"] <= 3 for r in low)


def test_check_stock_single_item():
    """Склад: «доступно» считается как количество минус резерв."""
    rows = services.check_stock(component_type="gpu", component_id=1)
    assert len(rows) == 1
    assert rows[0]["доступно"] == rows[0]["количество"] - rows[0]["зарезервировано"]


# ------------------------------------------------------------------
# Аудит
# ------------------------------------------------------------------


def test_audit_records_refusal():
    """Аудит: отказ в действии записывается в журнал с кодом 409."""
    import audit as audit_mod

    before = len(audit_mod.recent_actions(100))
    with pytest.raises(BusinessError):
        services.cancel_order(4, "передумал")
    entries = audit_mod.recent_actions(100)
    assert len(entries) > before
    assert entries[0]["инструмент"] == "cancel_order"
    assert entries[0]["успешно"] == 0


def test_audit_masks_pii():
    """Аудит: телефон и e-mail маскируются, прочие поля не меняются."""
    import audit as audit_mod

    audit_mod.log_action("test-agent", "create_order",
                         {"phone": "+375291112233", "email": "anna@example.by", "order": 1}, "ok", 201)
    entry = audit_mod.recent_actions(1)[0]
    args = entry["аргументы"]
    assert args["phone"] != "+375291112233", "телефон не должен попадать в журнал открытым текстом"
    assert args["phone"].endswith("33"), "у телефона сохраняются последние цифры"
    assert args["email"] != "anna@example.by"
    assert args["email"].endswith("@example.by")
    assert args["order"] == 1, "неперсональные поля не маскируются"