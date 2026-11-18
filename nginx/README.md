# Локальный nginx

Проверка сайта «как на проде»: nginx раздаёт прод-сборку клиента и проксирует
API, GraphQL и файлы на локальный сервер.

- http://localhost — сайт (прод-сборка из `client/dist`)
- `/graphql` и `/socket.io/` — прокси на API (`:5000`)
- `/storage/` — файлы раздаёт сам nginx, доступ проверяет API через `/_storage-auth`
- Vite-дев на `:5173` при этом не нужен

## Быстрый старт

```powershell
# из корня репозитория
powershell -ExecutionPolicy Bypass -File nginx\start-nginx.ps1 -Build
```

`-Build` пересобирает клиент так, чтобы он ходил на тот же origin
(`VITE_API_URL=http://localhost`, `VITE_STATIC_URL=''`). Без `-Build` берётся
уже собранный `client/dist`: так быстрее, если менялся только сервер.

Если nginx уже запущен, скрипт просто скажет об этом. Перезапуск:

```powershell
powershell -ExecutionPolicy Bypass -File nginx\start-nginx.ps1 -Force
```

Остановка:

```powershell
powershell -ExecutionPolicy Bypass -File nginx\stop-nginx.ps1
```

## Что нужно, кроме nginx

1. API на `:5000` (иначе `/healthz` и GraphQL ответят 502).
2. Собранный клиент в `client/dist` (иначе 404 на `/`).

## Про пути и диск X:

nginx под Windows плохо работает с кириллицей в путях, поэтому конфиг и
скрипты используют виртуальный диск:

```cmd
subst X: C:\Users\FID\Desktop\проекты
```

Скрипты создают его сами и снимают по `-Clean`. Вручную:

```cmd
subst X: /D
```

nginx берётся из `C:\Users\FID\Desktop\проекты\nginx-1.30.6` (параметр
`-NginxRoot`, если папка переехала).

## Вручную, без скриптов

```cmd
cd /d X:\nginx-1.30.6
nginx.exe -p X:/nginx-1.30.6/ -c X:/anidale/nginx/anidale.conf -t
nginx.exe -p X:/nginx-1.30.6/ -c X:/anidale/nginx/anidale.conf
nginx.exe -p X:/nginx-1.30.6/ -c X:/anidale/nginx/anidale.conf -s quit
```

Логи: `nginx-1.30.6\logs\error.log` и `access.log`.

## Конфиги

- `nginx/anidale.conf` — локальная проверка (этот сценарий).
- `nginx/anidale.prod.conf` — боевой сервер: другие пути, HTTPS, кеширование.

Отличия локального конфига: `client_max_body_size 110m` (загрузка видео через
админку), gzip, проксирование `/graphql` и `/socket.io/`, раздача `/storage/`
с проверкой прав и SPA-fallback на `index.html`.
