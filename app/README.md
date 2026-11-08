# Peetri Toll — приложение

Сайт и админка на Nuxt + PostgreSQL. План работ — раздел 6.1 в `../REQUIREMENTS.md`,
что уже сделано — 6.2 «Ход разработки» там же.
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
- после создания новой папки (например, `server/middleware`) сервер в контейнере её
  не замечает: `docker compose restart app`

## Что уже есть

| Адрес                                      | Что там                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------ |
| `/`                                        | перенаправляет на язык: `/et`, `/en` или `/ru`                                 |
| `/et`, `/en`, `/ru`                        | временная главная — проверка дизайна и языков                                  |
| `/admin/login`                             | вход для сотрудников                                                           |
| `/admin`                                   | заглушка раздела «Заявки»                                                      |
| `/admin/menu`                              | основное меню: список блюд, поиск, фильтр, «На сайте», порядок перетаскиванием |
| `/admin/menu/:id`, `/admin/menu/new`       | карточка блюда, фото — загрузкой файла                                         |
| `/admin/menu/setup`                        | категории и два справочника отметок, их порядок перетаскиванием                |
| `/admin/menu/lunch`                        | дневное меню: неделя по дням, цены, настройки меню дня                         |
| `/admin/menu/banquet`, `/admin/menu/group` | банкетное и групповое меню: каталог для калькулятора, настройки                |
| `/api/health`                              | приложение и база живы                                                         |

Остальные пункты меню админки и ссылки в шапке сайта ведут на ещё не созданные страницы.

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

## Вход в админку

- роли: админ (всё, включая владельцев), владелец (всё, включая сотрудников), сотрудник
  (только выданные разделы) — `shared/access.ts`, решение в 5.2 требований
- регистрации нет; админа и владельца создаёт команда (приложение запущено),
  `role` — `owner` или `admin`:

  ```bash
  docker compose exec app npx nuxi task run users:create \
    --payload '{"email":"olga@peetritoll.ee","name":"Ольга Петрова","role":"owner","password":"не короче 10 символов"}'
  ```

- если единственный владелец или админ потерял пароль — новый командой; старые сессии закрываются:

  ```bash
  docker compose exec app npx nuxi task run users:reset-password \
    --payload '{"email":"olga@peetritoll.ee","password":"новый пароль"}'
  ```

- сотрудников заводит владелец в разделе «Сотрудники» (срез 1.5); там же сброс пароля ссылкой
- сессия — зашифрованная cookie `pt_admin` (nuxt-auth-utils), 12 часов,
  с «Запомнить меня» — 30 дней; ключ — `NUXT_APP_SECRET` (`.env.example`)
- страницы админки: `definePageMeta({ layout: 'admin', access: [...разделы] })`,
  без входа ведут на `/admin/login`, без прав — 403 (`app/middleware/admin.global.ts`)
- запросы `/api/admin/**` — только для вошедших; права на раздел обработчик проверяет сам:
  `await requireAccess(event, 'menu', 'edit')` (`server/utils/auth.ts`)
- 5 неудачных попыток входа за 15 минут — вход с этого адреса на эту почту закрыт на 15 минут

## Настройки сайта

- таблица `settings` «ключ → значение» (JSON), чтение и запись — `readSetting` / `writeSetting`
  (`server/utils/settings.ts`); форма значения — схема zod в `shared/` для каждого ключа
- ключи: `lunch` — настройки дневного меню (`shared/lunch.ts`), `banquet` и `group` —
  калькуляторов (`shared/catalog.ts`); недостающее в базе берётся из значения по умолчанию
- даты без времени — строкой «2026-11-09», «сегодня» — по Таллину (`shared/dates.ts`)

## Картинки

- таблица `media` и файлы на диске в `NUXT_UPLOADS_DIR` (в Docker — том `uploads`, отдельно от кода);
  в базе — папка и размеры, адреса собирает `shared/media.ts`
- загрузка: `POST /api/admin/media` (multipart, поле `file`) — JPG / PNG / WebP до 15 МБ,
  от 600 px по длинной стороне; уменьшается в WebP: 320, 800 и исходная ширина до 1600
- раздача: `/uploads/2026/11/<id>/800.webp`, кэш на год (новая картинка — новая папка)
- в формах — компонент `AdminImageUpload` (`v-model:image`, `v-model:legacy`)
- перенос старых фото блюд по ссылкам со старого сайта (повторный запуск — только новое):
  `docker compose exec app npx nuxi task run media:import-dish-photos`

## API

- админские запросы — `/api/admin/**`, права проверяет каждый обработчик (см. выше)
- данные от браузера проверяет схема zod — одна на сервер и форму (`shared/menu.ts`),
  на сервере `readBodyWith(event, схема)` (`server/utils/validate.ts`)
- текст ошибки для человека — в `message`, не в `statusMessage`: там кириллица портится;
  в браузере его достаёт `apiErrorMessage(e, 'запасной текст')` (`app/utils/api-error.ts`)
- `$fetch` с адресом из вариантов — с явным типом ответа `$fetch<unknown>(…)`,
  иначе типизация маршрутов Nuxt падает с TS2321

## База

- схема — `server/db/schema/`, по файлу на область (`users.ts`, `menu.ts`), собирается в `index.ts`
- тексты на трёх языках — таблицы `*_translations`, строка на язык; какой показать —
  `pickTranslation` в `shared/locales.ts` (язык страницы → эстонский → любой имеющийся)
- деньги — целым числом в центах (`price_cents`)
- начальное наполнение основного меню из прототипа (только в пустую базу):
  `docker compose exec app npx nuxi task run seed:menu`; данные — `server/db/seed/menu.json`
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
