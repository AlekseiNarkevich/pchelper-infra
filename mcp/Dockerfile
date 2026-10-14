# =====================================================================
#  PCHelper — образ MCP-сервера
#  Лабораторная работа № 4, задание 6, пункт 8 (контейнеризация MCP).
#
#  Собирается из каталога mcp/ командой:
#      docker compose --profile mcp build mcp
#  Запускается в режиме Streamable HTTP на порту 8080,
#  чтобы к нему мог подключиться MCP Inspector.
# =====================================================================

FROM python:3.12-slim AS prod

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PCHELPER_AGENT_NAME=docker

# Непривилегированный пользователь: процесс внутри контейнера
# не должен работать от root.
RUN adduser --disabled-password --gecos "" mcp

# Каталог под mock-базу создаём ЗАРАНЕЕ и передаём его пользователю mcp.
# Именованный том, подключённый к этому каталогу, наследует его владельца
# при первом создании — поэтому сервер сможет создать файл базы.
# Если указать путь внутри /app, том будет принадлежать root, и появится
# ошибка «sqlite3.OperationalError: unable to open database file».
RUN mkdir -p /data && chown mcp:mcp /data
VOLUME ["/data"]

ENV PCHELPER_DB=/data/pchelper_mcp.db

USER mcp

# --- Зависимости отдельным слоём: пересобираются только при их изменении ---
COPY --chown=mcp:mcp requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# --- Исходники сервера ---
COPY --chown=mcp:mcp . .

EXPOSE 8080

# Healthcheck: обращаемся к HTTP-эндпоинту MCP-сервера.
# Логика вынесена в healthcheck.py, потому что «голый» GET на /mcp
# возвращает 406 Not Acceptable — это норма для протокола MCP,
# и стандартная проверка urllib посчитала бы контейнер мёртвым.
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD ["python", "healthcheck.py"]

# --http — режим Streamable HTTP вместо stdio;
# 0.0.0.0 обязателен, иначе контейнер принимает соединения только с localhost.
CMD ["python", "server.py", "--http", "--host", "0.0.0.0", "--port", "8080"]