#!/usr/bin/env python3
"""
PCHelper MCP-сервер — проверка живости для HEALTHCHECK в Docker.

Зачем отдельный скрипт. Эндпоинт /mcp в режиме Streamable HTTP
отвечает кодом 406 Not Acceptable на «голый» GET без заголовка
Accept: application/json, text/event-stream — это нормальное поведение
протокола MCP, а не поломка. Стандартный healthcheck на urllib
воспринимает любой код >= 400 как смерть процесса и помечает
контейнер как unhealthy, хотя сервер полностью работоспособен.

Поэтому здесь:
  * HTTPError (в том числе 406)  -> сервер жив, считаем успехом;
  * URLError / таймаут           -> сервер не отвечает, это уже поломка.

Код возврата: 0 — жив, 1 — мёртв.
"""

import sys
import urllib.error
import urllib.request

URL = "http://127.0.0.1:8080/mcp"
TIMEOUT = 4


def main() -> int:
    request = urllib.request.Request(
        URL,
        headers={"Accept": "application/json, text/event-stream"},
    )
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
            print(f"[healthcheck] сервер ответил кодом {response.status}")
            return 0
    except urllib.error.HTTPError as error:
        # Любой HTTP-ответ означает, что процесс слушает порт и отвечает.
        # В том числе 406 — ожидаемый ответ MCP на неполный запрос.
        print(f"[healthcheck] сервер ответил кодом {error.code} (это не поломка)")
        return 0
    except (urllib.error.URLError, OSError) as error:
        print(f"[healthcheck] сервер недоступен: {error}")
        return 1


if __name__ == "__main__":
    sys.exit(main())