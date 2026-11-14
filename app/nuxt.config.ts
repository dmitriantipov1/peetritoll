// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint', '@nuxtjs/i18n', 'nuxt-auth-utils'],

  // Дизайн из прототипа. admin.css тоже глобальный: его правила с префиксом adm-
  // и включаются классом adm-body, который ставит макет админки.
  css: ['~/assets/css/style.css', '~/assets/css/admin.css'],

  app: {
    head: {
      meta: [
        // Убрать только перед запуском, как и в прототипе
        { name: 'robots', content: 'noindex' },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Kurale&family=Lora:ital,wght@0,400;0,500;0,700;1,400&family=Source+Sans+3:wght@400;600&display=swap&subset=cyrillic,latin-ext',
        },
      ],
    },
  },

  // Языки (5.1 в требованиях): у всех публичных страниц префикс /et, /en, /ru,
  // адрес после префикса один для всех языков (/et/menu, /en/menu, /ru/menu).
  // Админка — без префикса: в её страницах defineI18nRoute(false).
  i18n: {
    strategy: 'prefix',
    defaultLocale: 'et',
    locales: [
      // label — подпись на кнопке переключателя, как в прототипе
      { code: 'et', language: 'et', name: 'Eesti', label: 'EE', file: 'et.json' },
      { code: 'en', language: 'en', name: 'English', label: 'EN', file: 'en.json' },
      { code: 'ru', language: 'ru', name: 'Русский', label: 'RU', file: 'ru.json' },
    ],
    // Язык браузера смотрим только на «/»: туда, где он есть среди наших, иначе /et/.
    // Перенаправление 302 (по умолчанию). Выбор гостя запоминаем в cookie.
    detectBrowserLanguage: {
      redirectOn: 'root',
      useCookie: true,
      cookieKey: 'i18n_lang',
      fallbackLocale: 'et',
    },
    // Абсолютные адреса для hreflang и canonical: NUXT_PUBLIC_I18N_BASE_URL
    baseUrl: '',
  },

  // Значения подставляются из переменных окружения NUXT_*:
  // NUXT_DATABASE_URL → runtimeConfig.databaseUrl
  // NUXT_APP_SECRET → секрет приложения, из него шифруется cookie сессии админки
  runtimeConfig: {
    databaseUrl: '',
    // NUXT_UPLOADS_DIR → папка с загруженными картинками (в Docker — том uploads)
    uploadsDir: './storage/uploads',
    // NUXT_FILES_DIR → закрытая папка файлов цифровых товаров (в Docker — том files), наружу не раздаётся
    filesDir: './storage/files',
    // Отправка писем (nodemailer, SMTP). NUXT_SMTP_HOST, NUXT_SMTP_PORT, NUXT_SMTP_USER, NUXT_SMTP_PASS,
    // NUXT_SMTP_FROM. В разработке — Mailpit из docker-compose.yml; без хоста письма не отправляются
    smtp: {
      host: '',
      port: 587,
      user: '',
      pass: '',
      from: 'Peetri Toll <noreply@peetritoll.ee>',
    },
    // Уведомления о заявках в канал Telegram (5.4): NUXT_TELEGRAM_BOT_TOKEN, NUXT_TELEGRAM_CHAT_ID.
    // Пусто — Telegram пропускаем, письмо уходит всё равно
    telegram: {
      botToken: '',
      chatId: '',
    },
    session: {
      name: 'pt_admin',
      // Без «Запомнить меня» — 12 часов (рабочий день); с ним — 30 дней (server/api/auth/login.post.ts)
      maxAge: 60 * 60 * 12,
      cookie: { sameSite: 'lax' },
    },
  },

  // Серверные задачи: создание владельца (server/tasks/users/create-owner.ts)
  nitro: {
    experimental: { tasks: true },
  },

  // Плавный переход между страницами (14.11.2026, как в прототипе): Nuxt оборачивает смену
  // страницы в document.startViewTransition, вид перехода — ::view-transition-* в style.css.
  // При «уменьшить движение» Nuxt переход не запускает
  experimental: { viewTransition: true },

  typescript: {
    strict: true,
    // Конфиги инструментов в корне app/ выполняются в Node, а не в Nuxt:
    // добавляем их в node-проект TypeScript вместе с типами Node (process и т. п.)
    nodeTsConfig: {
      include: ['../drizzle.config.ts'],
      compilerOptions: { types: ['node'] },
    },
  },
})
