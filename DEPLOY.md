# Запуск в продакшене

Короткий чек-лист. Шаблоны настроек: `server/.env.production.example`, `client/.env.production.example`, `nginx/anidale.prod.conf`.

## 1. База данных

- Не используйте пользователя `postgres`. Создайте отдельного с длинным паролем и правами только на базу `anidale`:
  `CREATE ROLE anidale LOGIN PASSWORD '…'; CREATE DATABASE anidale OWNER anidale;`
- Порт 5432 закрыт от внешней сети (слушает только `127.0.0.1`).
- Схема: `cd server && npm run db:migrate` — применяет миграции из `server/prisma/migrations` (при остановленном сервере).
- **Существующая база**, созданная раньше через `prisma db push`: один раз отметьте первую миграцию применённой —
  `npx prisma migrate resolve --applied 20261117000000_init`, дальше используйте только `npm run db:migrate`.
- Новые изменения схемы делайте локально через `npx prisma migrate dev` и коммитьте появившуюся миграцию.
  В продакшене `migrate dev` и `db push` не запускайте: они могут пересоздать данные.
- Перед миграцией сделайте копию базы (раздел 7).

### Redis (необязательно)

- Нужен для кэша каталога и музыки, общих онлайн-статусов и ограничителей частоты: `apt install redis-server`, слушает только `127.0.0.1:6379`.
- В `server/.env` добавьте `REDIS_URL=redis://127.0.0.1:6379`. Без переменной сервер работает как раньше: кэш выключен, ограничители считаются в PostgreSQL, а онлайн-статусы живут в памяти процесса.
- Ключи кэша и счётчиков имеют TTL и не требуют ручной чистки. Порт 6379 наружу не открывайте.

## 2. Секреты (`server/.env`)

- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — разные, не короче 64 случайных символов.
- `PASS_PEPPER` — не короче 32 символов. **Не меняйте после запуска**: все пароли перестанут подходить.
- `.env` не коммитится и доступен только владельцу (`chmod 600`).
- `CLIENT_URL` — адрес сайта по HTTPS, `TRUST_PROXY=1` (сервер за nginx).

## 3. Почта

- Подтверждение адреса и сброс пароля уходят через SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` (шаблон — `server/.env.production.example`).
- Для Яндекса и Mail.ru нужен «пароль приложения», а не пароль от почты; адрес в `SMTP_FROM` должен совпадать с `SMTP_USER`.
- Без `SMTP_HOST` письма не отправляются, а ссылки печатаются в консоль сервера. Это годится только для разработки: в продакшене пользователи не смогут подтвердить почту и восстановить пароль.
- Ссылки в письмах строятся от `CLIENT_URL`, поэтому он должен совпадать с настоящим адресом сайта.

## 4. Запуск

```
cd server && npm ci && npm run build && npm run db:migrate
cd client && npm ci && npm run build          # собирает client/dist
```

`npm run build` в сервере собирает `server/dist` (обычный JS, без компиляции на лету).
`npm run start:prod` запускает собранный файл с `NODE_ENV=production`: отключённая интроспекция GraphQL,
куки с `Secure`, заголовок HSTS.

Сервер должен работать под process manager, иначе он не поднимется после падения или перезагрузки.
Готовый unit — `deploy/anidale.service`:

```
sudo cp deploy/anidale.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now anidale
sudo systemctl status anidale
```

Пути `/srv/anidale` в unit замените на свои. Порт 5000 закрыт файрволом: к нему обращается только nginx
на этом же компьютере. Проверка живости: `curl -sS http://127.0.0.1:5000/healthz`.

Альтернатива systemd — `pm2 start "npm run start:prod" --name anidale` с `pm2 save` и `pm2 startup`.

## 5. nginx

Возьмите `nginx/anidale.prod.conf`, замените домен и пути, получите сертификат (например, certbot).
Что он делает:

- HTTPS, заголовки безопасности (HSTS, CSP, nosniff, запрет фреймов);
- отдаёт собранный клиент, проксирует `/graphql` и `/socket.io`;
- файлы из `/storage` выдаёт только после проверки на сервере (`auth_request` → `/_storage-auth`): аватарки открыты всем, остальное — тем, кому видна запись, сообщение или сообщество;
- ограничивает частоту запросов по адресу (`limit_req`).

Проверка CSP: откройте сайт, посмотрите консоль браузера и при необходимости расширьте политику.

## 6. Ограничители частоты

- На сервере: вход, регистрация, публикации, комментарии, сообщения, загрузки, лайки, вступления.
  Лимиты — в `server/src/utils/rate-limit.ts` (`POLICIES`).
- При настроенном Redis счётчики живут в Redis (`INCR` + TTL), поэтому общие для всех процессов и переживают
  перезапуск. Если Redis недоступен, те же лимиты считаются в таблице `RateLimit` в PostgreSQL — запросы
  не проходят без ограничений.
- В nginx: общий поток запросов к API и файлам (`limit_req`), плюс ограничение соединений с адреса.

## 7. Резервные копии

- `cd server && npm run backup` — делает `pg_dump` базы и архив `storage` в `server/backups`
  (меняется через `BACKUP_DIR`, срок хранения — `BACKUP_KEEP_DAYS`, по умолчанию 14 дней).
- Ежедневный запуск: готовые `deploy/anidale-backup.service` и `deploy/anidale-backup.timer`
  (установка описана в файлах) либо cron:

```
17 3 * * * cd /srv/anidale/server && BACKUP_DIR=/var/backups/anidale /usr/bin/node scripts/backup.mjs >> /var/log/anidale-backup.log 2>&1
```

- Восстановление:

```
# база (сервер остановлен). Если в DB_LINK есть ?schema=public — уберите его:
# pg_restore не понимает параметр schema.
pg_restore --clean --if-exists --no-owner -d "postgresql://anidale:ПАРОЛЬ@127.0.0.1:5432/anidale" /var/backups/anidale/anidale-ГГГГММДД-ЧЧММСС.dump
# файлы
tar -xzf /var/backups/anidale/anidale-ГГГГММДД-ЧЧММСС.tar.gz -C /srv/anidale/server
```

- Раз в месяц проверяйте, что копия действительно восстанавливается, и следите за свободным местом.

## 8. Мониторинг

- `GET /healthz` возвращает JSON: `status` (`ok` / `degraded` / `down`), состояние базы и Redis, uptime.
  200 — сервер обслуживает запросы, 503 — база недоступна. Секретов в ответе нет.
- Настройте внешнюю проверку `/healthz` (например, UptimeRobot) и алерт на 503.
- Следите за: ошибками 5xx в логах nginx, свободным местом на диске, памятью Redis и `evicted_keys`.

## 9. Регулярно

- `npm audit --omit=dev` в `client` и `server`; обновления зависимостей — с прогоном тестов (`npm test`).
- Резервные копии базы и каталога `server/storage` (раздел 7).
