# Peetri Toll — приложение

Сайт и админка на Nuxt + PostgreSQL. План работ — раздел 6.1 в `../REQUIREMENTS.md`.
Прототип дизайна лежит в корне репозитория и служит эталоном; эта папка на GitHub Pages
не публикуется (`../_config.yml`).

## Что нужно на машине

- Docker (Docker Desktop или OrbStack).
- Для запуска без Docker и для редактора — Node.js 24 (версия в `.nvmrc`).

## Запуск в Docker (основной способ)

```bash
cp .env.example .env
docker compose up
```

- сайт: http://localhost:3000
- проверка, что приложение и база живы: http://localhost:3000/api/health
- миграции применяются сами при старте контейнера `app`
- после смены зависимостей: `docker compose up --build -V`

## Запуск на машине, база в Docker

```bash
docker compose up db
npm install
npm run db:migrate
npm run dev
```

## База

- схема — `server/db/schema.ts`
- `npm run db:generate` — SQL-миграция из изменений схемы (`server/db/migrations`)
- `npm run db:migrate` — применить миграции
- `npm run db:studio` — просмотр базы в браузере

## Проверки

```bash
npm run lint
npm run typecheck
```
