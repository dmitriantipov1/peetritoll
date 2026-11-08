// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint'],

  // Дизайн из прототипа. admin.css тоже глобальный: его правила с префиксом adm-
  // и включаются классом adm-body, который ставит макет админки.
  css: ['~/assets/css/style.css', '~/assets/css/admin.css'],

  app: {
    head: {
      htmlAttrs: { lang: 'ru' },
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

  // Значения подставляются из переменных окружения NUXT_*:
  // NUXT_DATABASE_URL → runtimeConfig.databaseUrl
  runtimeConfig: {
    databaseUrl: '',
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
