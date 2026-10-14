"""
PCHelper MCP-сервер — аудит действий агента.

Требование задания 5: «работа с конфиденциальными данными
(требование к логированию действий агента)».

Каждый вызов инструмента и каждое чтение ресурса фиксируются
в таблице «ЖурналДействийАгента»:
  * момента времени,
  * идентификатора агента (LLM-клиента),
  * имени инструмента / URI ресурса,
  * аргументов — с маскированием персональных данных,
  * результата и кода ответа,
  * признака успеха и длительности выполнения.
"""

from __future__ import annotations

import time
from contextlib import contextmanager
from typing import Any, Iterator

from db import dumps, get_conn

#: Поля, значения которых маскируются перед записью в журнал.
PII_FIELDS = ("телефон", "phone", "address", "адрес_доставки", "email", "пароль", "password")


def mask_pii(payload: dict[str, Any]) -> dict[str, Any]:
    """Заменяет значения персональных данных маскированными."""
    masked: dict[str, Any] = {}
    for key, value in (payload or {}).items():
        lowered = str(key).lower()
        if any(pii in lowered for pii in PII_FIELDS):
            text = str(value)
            if "@" in text:
                masked[key] = text.split("@")[0][:2] + "***@" + text.split("@")[1]
            elif lowered in ("телефон", "phone") and len(text) >= 7:
                masked[key] = text[:4] + "…" + text[-2:]
            else:
                masked[key] = "***"
        elif isinstance(value, dict):
            masked[key] = mask_pii(value)
        else:
            masked[key] = value
    return masked


def log_action(
    agent: str,
    tool: str,
    arguments: dict[str, Any] | None = None,
    result: str | None = None,
    status_code: int | None = None,
    success: bool = True,
    duration_ms: int | None = None,
) -> None:
    """Однократная запись в журнал действий агента."""
    with get_conn() as conn:
        conn.execute(
            'INSERT INTO "ЖурналДействийАгента" '
            "(момент, агент, инструмент, аргументы, результат, код_ответа, успешно, длительность_мс) "
            "VALUES (datetime('now'), ?, ?, ?, ?, ?, ?, ?)",
            (
                agent,
                tool,
                dumps(mask_pii(arguments or {})),
                (result or "")[:1000],
                status_code,
                1 if success else 0,
                duration_ms,
            ),
        )
        conn.commit()


@contextmanager
def audit(agent: str, tool: str, arguments: dict[str, Any] | None = None) -> Iterator[dict]:
    """
    Контекстный менеджер, оборачивающий вызов инструмента.

    Использование::

        with audit(AGENT, "cancel_order", {"orderId": 3}) as ctx:
            result = do_something()
            ctx["result"] = "Отменён"

    При исключении запись делается с ``success=False``, а результат —
    текст ошибки. Исключение пробрасывается дальше (сервер MCP сам
    преобразует его в ответ ``isError``), поэтому бизнес-правило
    «отменять доставленный заказ нельзя» остаётся неприступным
    для обхода.
    """
    ctx: dict[str, Any] = {"result": None, "status": None, "success": True}
    started = time.perf_counter()
    try:
        yield ctx
    except Exception as exc:  # noqa: BLE001 — нам важно залогировать любой отказ
        ctx["success"] = False
        ctx["status"] = 409 if "Отмена невозможна" in str(exc) else 400
        log_action(
            agent, tool, arguments,
            result=str(exc), status_code=ctx["status"], success=False,
            duration_ms=int((time.perf_counter() - started) * 1000),
        )
        raise
    else:
        log_action(
            agent, tool, arguments,
            result=str(ctx["result"]) if ctx["result"] is not None else "ok",
            status_code=ctx["status"] or 200, success=True,
            duration_ms=int((time.perf_counter() - started) * 1000),
        )


def recent_actions(limit: int = 50) -> list[dict]:
    """Последние записи журнала — источник ресурса pchelper://audit/recent."""
    import json

    with get_conn() as conn:
        rows = conn.execute(
            'SELECT * FROM "ЖурналДействийАгента" ORDER BY id DESC LIMIT ?',
            (max(1, min(limit, 200)),),
        ).fetchall()
    result = []
    for r in rows:
        item = dict(r)
        try:
            item["аргументы"] = json.loads(item["аргументы"])
        except (TypeError, ValueError):
            pass
        result.append(item)
    return result