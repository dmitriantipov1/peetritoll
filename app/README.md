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

## Языки

- `@nuxtjs/i18n`, настройки в `nuxt.config.ts` (раздел 5.1 требований)
- у всех публичных страниц префикс: `/et/menu`, `/en/menu`, `/ru/menu`; `/` перенаправляет
  на язык браузера или `/et`, выбор гостя запоминается в cookie `i18n_lang`
- строки интерфейса — `i18n/locales/{et,en,ru}.json`; если перевода нет, показываем эстонский
- ссылки на страницы сайта — через `localePath('/menu')`: префикс добавляется только
  к существующей странице, на несуществующую ссылка останется без него
- страницы админки — без префикса: в каждой `defineI18nRoute(false)`

## База

- схема — `server/db/schema.ts`
- `npm run db:generate` — SQL-миграция из изменений схемы (`server/db/migrations`)
- `npm run db:migrate` — применить миграции
- `npm run db:studio` — просмотр базы в браузере

## Проверки

```bash
npm run lint           # ESLint: ошибки и подозрительный код
npm run format:check   # Prettier: оформление
npm run typecheck      # TypeScript
```

Исправить автоматически: `npm run lint:fix` и `npm run format`.

- ESLint — базовые рекомендованные правила для JS, TypeScript и Vue (`@nuxt/eslint`),
  правила оформления выключены (`eslint-config-prettier`): ими занимается Prettier.
- Prettier — настройки по умолчанию, кроме трёх: без точек с запятой, одинарные кавычки,
  строка до 100 символов (`.prettierrc.json`).
- Стили в `app/assets/css` Prettier не трогает: они перенесены из прототипа как есть
  и сверяются с ним построчно (`.prettierignore`).
- WebStorm: Settings → Languages & Frameworks → JavaScript → Prettier → «Automatic Prettier
  configuration» и «Run on save»; ESLint там же, «Automatic ESLint configuration».
