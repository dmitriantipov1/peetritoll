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

| Адрес                                      | Что там                                                                                 |
| ------------------------------------------ | --------------------------------------------------------------------------------------- |
| `/`                                        | перенаправляет на язык: `/et`, `/en` или `/ru`                                          |
| `/et`, `/en`, `/ru`                        | временная главная — проверка дизайна и языков                                           |
| `/admin/login`                             | вход для сотрудников                                                                    |
| `/admin`                                   | заглушка раздела «Заявки»                                                               |
| `/admin/menu`                              | основное меню: список блюд, поиск, фильтр, «На сайте», порядок перетаскиванием          |
| `/admin/menu/:id`, `/admin/menu/new`       | карточка блюда, фото — загрузкой файла                                                  |
| `/admin/menu/setup`                        | категории и два справочника отметок, их порядок перетаскиванием                         |
| `/admin/menu/lunch`                        | дневное меню: неделя по дням, цены, настройки меню дня                                  |
| `/admin/menu/banquet`, `/admin/menu/group` | банкетное и групповое меню: каталог для калькулятора, настройки                         |
| `/admin/contacts`                          | контакты и часы: часы работы, особые дни, адрес, связь, соцсети, предпросмотр подвала   |
| `/admin/settings`                          | настройки сайта: разделы и языки, почта для заявок, мероприятия и афиши                 |
| `/admin/materials`                         | новости, мероприятия, страницы: список, карточка с редактором текста                    |
| `/admin/gallery`                           | галерея: фото по категориям, подписи, порядок перетаскиванием, категории                |
| `/admin/staff`, `/admin/staff/:id`, `new`  | сотрудники: список с доступом и статусом, карточка — роль, права по разделам, отключить |
| `/admin/password?token=…`                  | задать пароль по ссылке из «Сотрудников» — без входа                                    |
| `/admin`                                   | заявки: сводка, вкладки по видам, статус, дата визита, поиск                            |
| `/admin/requests/:id`                      | карточка заявки: визит, расчёт, гость, история, статус                                  |
| `/api/health`                              | приложение и база живы                                                                  |

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

- сотрудников заводит владелец в разделе «Сотрудники» (`/admin/staff`, API `/api/admin/staff`).
  Кто кого может менять — `shared/staff.ts` (`canManage`, `assignableRoles`), проверяет сервер
  (`server/utils/staff.ts`): админ — всех; владелец — только сотрудников (админов и владельцев
  видит без правки, роль «владелец» не выдаёт); себе роль не меняют и себя не отключают.
  Права хранятся без «нет доступа» и без раздела «Сотрудники» (`cleanPermissions`).
  Новый сотрудник создаётся без пароля — статус «Приглашён». Отключение и новые права действуют сразу
- ссылки «задать пароль» — `server/utils/password-links.ts`, таблица `password_links`: в базе только
  SHA-256 от ключа ссылки, сама ссылка показывается один раз в ответе
  `POST /api/admin/staff/:id/password-link`. Ни разу не входил — приглашение на 7 дней, иначе —
  новый пароль на 24 часа: прежний пароль и сессии гаснут сразу. Новая ссылка гасит прежнюю.
  Адрес ссылки — от `NUXT_PUBLIC_I18N_BASE_URL`. Страница `/admin/password?token=…` — без входа
  (`GET /api/auth/password-link`, `POST /api/auth/password`), после пароля человек сразу входит
- в разработке задача запускается и запросом к dev-серверу, если `nuxi task run` в контейнере
  зависает: `curl -X POST localhost:3000/_nitro/tasks/users:reset-password -d '{"payload":{…}}'`
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
  калькуляторов (`shared/catalog.ts`), `hours` и `contacts` — часы и контакты
  (`shared/contacts.ts`), `sections`, `notifications`, `events` — настройки сайта
  (`shared/site-settings.ts`); недостающее в базе берётся из значения по умолчанию
- «показывать меню дня» хранится в `sections.lunch`, экран дневного меню читает и пишет туда же
- строку часов для подвала («Открыто: пн–чт 11.00–18.00, …») собирает `hoursLine(week, locale)`
- даты без времени — строкой «2026-11-09», «сегодня» — по Таллину (`shared/dates.ts`)

## Материалы

- новости, мероприятия и страницы — одна таблица `materials` с типом (5.7), переводы —
  `material_translations` (заголовок, адрес, коротко, текст), у мероприятия — `material_events`
- состояние хранится тремя значениями (черновик, на сайте, в архиве), а «запланировано»
  и «прошедшее — в архив» выводит `materialStatus` (`shared/materials.ts`): по расписанию
  ничего не переключается
- где показывать (8.5) — `materials.locales`; это не перевод: язык без перевода, но включённый,
  покажет эстонский текст
- адрес свой у каждого языка, на языке не повторяется (уникальный индекс `locale + slug`);
  пустой собирается из заголовка (`shared/slug.ts`), страницы не берут адреса разделов
- дата выхода в форме — по Таллину (`<input type="datetime-local">`), в базе — момент времени;
  перевод — `fromTallinnLocal` / `toTallinnLocal` (`shared/dates.ts`)
- текст — редактор TipTap (`app/components/AdminRichText.vue`), в базе HTML;
  сервер чистит его по белому списку (`server/utils/rich-text.ts`, sanitize-html),
  картинки в тексте — только загруженные к нам (`/uploads/…`)

## Заявки

- одна таблица `requests` на все виды: `table`, `banquet`, `group`, `lunch`, `tour`, `event`
  (`server/db/schema/requests.ts`); номера с 1001. Общее — колонками, своё у вида — `details`,
  расчёт банкета, группы, обеда — снимком цен в `calc`, «как пришла» — `original`
- проверка данных из формы и правки — `shared/requests.ts` (`requestInputSchema`, `requestPatchSchema`),
  одна для форм сайта и админки; какое право открывает вид — `requestSection`
- `createRequest`, `setRequestStatus`, `updateRequest` — `server/utils/requests.ts`; цены считает сервер,
  с сайта без согласия на обработку заявку не принимает (8.1), каждое действие — строка в `request_history`
- API админки: `GET /api/admin/requests` (только виды, которые сотруднику видны — `requestTypesFor`),
  `GET` и `PUT /api/admin/requests/:id` (поля, статус и пояснение одним запросом — `saveRequest`;
  нужен «правит» на раздел вида — `requireRequestAccess`)
- тестовые заявки (почты `*@peetritoll.test`, от имени тестового админа):
  `docker compose exec app npx nuxi task run seed:requests`. Новую задачу dev-сервер видит после перезапуска

## Галерея

- `gallery_categories` и `gallery_photos` с переводами (название категории, подпись фото — она же alt);
  четыре категории из прототипа заводит миграция 0010
- порядок фото один на всю галерею (`sort`); перестановка на вкладке категории вписывается
  на места её фото в общем списке; первое видимое фото — обложка блока на сайте
- фото добавляется в два шага: картинка в `media` (`POST /api/admin/media`), затем
  `POST /api/admin/gallery/photos { mediaId, categoryId }`

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
