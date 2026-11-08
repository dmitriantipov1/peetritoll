// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint'],

  // Значения подставляются из переменных окружения NUXT_*:
  // NUXT_DATABASE_URL → runtimeConfig.databaseUrl
  runtimeConfig: {
    databaseUrl: '',
  },

  typescript: {
    strict: true,
  },
})
