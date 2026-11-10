// Тесты бизнес-логики (6.1, «С первого дня»): только чистые правила из shared/ — права, проверка
// данных заявки, склейка лидов, деньги. Без базы, браузера и Nuxt: фреймворк не тестируем.
// Запуск: npm test
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})
