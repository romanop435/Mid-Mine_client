# Mid-Mine Backend

Backend переведён на `PostgreSQL`, чтобы его можно было нормально держать на Render.

Он даёт:

- общую регистрацию и логин аккаунтов
- JSON API для лаунчера
- HTML админку новостей

## Что умеет

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/auth/me`
- `GET /api/news`
- `GET /api/news/:id`
- `GET /admin/login`
- `GET /admin/news`
- создание, редактирование и удаление новостей через встроенную HTML admin panel

## Переменные окружения

- `DATABASE_URL`
- `MIDMINE_JWT_SECRET`
- `MIDMINE_ADMIN_EMAIL`
- `MIDMINE_ADMIN_PASSWORD`
- `PORT`
- `HOST`

## Локальный запуск

Нужен локальный Postgres. Самый простой способ через Docker:

```powershell
docker run --name midmine-postgres `
  -e POSTGRES_USER=midmine `
  -e POSTGRES_PASSWORD=midmine `
  -e POSTGRES_DB=midmine `
  -p 5432:5432 `
  -d postgres:16
```

Дальше:

```powershell
cd C:\Users\roman\Downloads\src\backend
npm install
$env:DATABASE_URL="postgresql://midmine:midmine@localhost:5432/midmine"
$env:MIDMINE_JWT_SECRET="very-strong-secret"
$env:MIDMINE_ADMIN_EMAIL="admin@example.com"
$env:MIDMINE_ADMIN_PASSWORD="strong-password"
npm run dev
```

Сервер:

```text
http://127.0.0.1:8787
```

Админка:

```text
http://127.0.0.1:8787/admin/login
```

## Деплой на Render

В репозитории уже добавлен [`render.yaml`](C:/Users/roman/Downloads/src/render.yaml).

### Вариант 1. Самый удобный

1. Залей репозиторий в GitHub.
2. Открой Render.
3. Нажми `New +`.
4. Выбери `Blueprint`.
5. Подключи репозиторий.
6. Render прочитает `render.yaml` и создаст:
   - `midmine-backend`
   - `midmine-postgres`
7. Введи вручную:
   - `MIDMINE_ADMIN_EMAIL`
   - `MIDMINE_ADMIN_PASSWORD`
8. Нажми deploy.

### Вариант 2. Вручную

1. Создай `PostgreSQL` database в Render.
2. Создай `Web Service`.
3. Укажи:
   - Root directory: `backend`
   - Build command: `npm install && npm run build`
   - Start command: `npm run start`
4. Добавь env vars:
   - `DATABASE_URL` = connection string из Render Postgres
   - `MIDMINE_JWT_SECRET` = длинная случайная строка
   - `MIDMINE_ADMIN_EMAIL`
   - `MIDMINE_ADMIN_PASSWORD`
   - `NODE_ENV=production`

## Как подключить лаунчер

Для новостей:

```powershell
$env:MIDMINE_NEWS_FEED_URL="https://your-render-service.onrender.com/api/news"
npm run dev
```

Этот endpoint уже соответствует формату, который ожидает лаунчер.

## Формат auth API

`POST /api/auth/register`

```json
{
  "email": "user@example.com",
  "username": "MidMinePlayer",
  "password": "secret123"
}
```

`POST /api/auth/login`

```json
{
  "email": "user@example.com",
  "password": "secret123"
}
```

Ответ:

```json
{
  "accessToken": "jwt",
  "refreshToken": "opaque-token",
  "refreshExpiresAt": "2026-03-14T00:00:00.000Z",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "MidMinePlayer",
    "role": "user",
    "premium": false,
    "createdAt": "2026-03-14T00:00:00.000Z",
    "updatedAt": "2026-03-14T00:00:00.000Z"
  }
}
```

## Проверка

```powershell
npm run typecheck
npm run build
```

## Важно про Render

На момент марта 2026 у Render есть free web services, но бесплатная PostgreSQL у них не выглядит как полноценный вечный production-план. Для нормальной стабильной прод-базы обычно лучше сразу брать платный database plan.
