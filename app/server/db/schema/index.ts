// Схема базы: по файлу на область, здесь всё собирается вместе.
// Миграции генерирует drizzle-kit:
//   npm run db:generate  — SQL-миграция из изменений схемы (папка server/db/migrations)
//   npm run db:migrate   — применить миграции к базе
//
// Импорты в файлах схемы — относительные: её читает и drizzle-kit, вне Nuxt, алиасов он не знает.
// Тексты на трёх языках — в таблицах «*_translations» (shared/locales.ts).
export * from './users'
export * from './menu'
export * from './media'
export * from './lunch'
export * from './settings'
