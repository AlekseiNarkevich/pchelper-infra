"""
PCHelper MCP-сервер — слой доступа к данным.

Работает с mock-базой SQLite (`pchelper_mcp.db`), имена таблиц и столбцов
совпадают с физической моделью PostgreSQL из задания 2 — тем самым MCP-сервер
оперирует теми же сущностями, что и REST-API.

Режимы (переменная окружения PCHELPER_MODE):
  * ``sqlite`` — режим по умолчанию для MVP: прямой доступ к SQLite;
  * ``api``    — прод-режим: вместо БД вызывается REST API ``api.pchelper.by``
                 (реализовано в сервисах как точка расширения).
"""

from __future__ import annotations

import json
import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = Path(os.getenv("PCHELPER_DB", BASE_DIR / "pchelper_mcp.db"))
SCHEMA_PATH = BASE_DIR / "schema.sql"
SEED_PATH = BASE_DIR / "seed.sql"

#: Типы компонентов каталога — соответствуют перечислителю ``component_type``
#: в PostgreSQL-модели (db/01_schema.sql).
COMPONENT_TYPES = (
    "cpu",
    "motherboard",
    "ram",
    "cooling",
    "gpu",
    "storage",
    "psu",
    "case",
)

#: Соответствие типа компонента и таблицы каталога.
TABLE_BY_TYPE: dict[str, str] = {
    "cpu": "Процессоры",
    "motherboard": "МатеринскиеПлаты",
    "ram": "ОЗУ",
    "cooling": "СистемыОхлаждения",
    "gpu": "Видеокарты",
    "storage": "Накопители",
    "psu": "БлокиПитания",
    "case": "Корпуса",
}

#: Статусы заказа в порядке жизненного цикла.
ORDER_STATUSES = ("Новый", "В обработке", "Собран", "Отправлен", "Доставлен", "Отменён")

#: Из этих статусов отмена заказа разрешена (требование задания 5).
CANCELLABLE_STATUSES = ("Новый", "В обработке")

#: Иерархия форм-факторов: корпус должен быть не меньше платы.
FORM_RANK = {"Mini-ITX": 1, "Micro-ATX": 2, "ATX": 3, "E-ATX": 4}

#: Коэффициент запаса мощности блока питания.
PSU_HEADROOM = 1.25


def init_db(reset: bool = False) -> Path:
    """Создаёт схему и наполняет БД демонстрационными данными.

    Схема и данные берутся из файлов `schema.sql` и `seed.sql`,
    которые лежат рядом с сервером и попадают в образ через
    инструкцию COPY в Dockerfile. Пользовательский ввод сюда не
    попадает: ни один инструмент MCP не принимает SQL.
    """
    if reset and DB_PATH.exists():
        DB_PATH.unlink()
    conn = sqlite3.connect(DB_PATH)
    try:
        # executescript выполняет целый файл, параметризация в нём
        # невозможна по назначению метода. SonarCloud помечает вызов
        # как SQL-инъекцию (pythonsecurity:S3649), но источник данных
        # — доверенный файл из образа, а не пользовательский ввод.
        conn.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))  # NOSONAR
        conn.executescript(SEED_PATH.read_text(encoding="utf-8"))  # NOSONAR
        conn.commit()
    finally:
        conn.close()
    return DB_PATH


@contextmanager
def get_conn() -> Iterator[sqlite3.Connection]:
    """Подключение к БД с включёнными внешними ключами и row_factory=dict."""
    if not DB_PATH.exists():
        init_db()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
    finally:
        conn.close()


def rows_to_dicts(rows: list[sqlite3.Row]) -> list[dict[str, Any]]:
    """Преобразует выборку sqlite3.Row в обычный список словарей.

    Нужна, чтобы результат можно было сериализовать в JSON
    для ответа MCP-клиенту: sqlite3.Row не сериализуется напрямую.
    """
    return [dict(r) for r in rows]


def loads(value: Any, default: Any = None) -> Any:
    """Безопасно разбирает JSON-строку из столбца SQLite."""
    if value in (None, ""):
        return default
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(value)
    except (TypeError, ValueError):
        return default


def dumps(value: Any) -> str:
    """Сериализует значение в JSON-строку с сохранением кириллицы.

    Параметр ensure_ascii=False нужен, чтобы в журнале аудита и в
    ответах инструментов читались русские названия товаров,
    а не их escape-последовательности вида «обратный слэш u XXXX».
    """
    return json.dumps(value, ensure_ascii=False, default=str)