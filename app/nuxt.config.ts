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
