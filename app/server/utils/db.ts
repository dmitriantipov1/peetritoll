// Подключение к PostgreSQL. В серверном коде Nuxt доступно без импорта: useDb().
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../db/schema'

let db: ReturnType<typeof drizzle<typeof schema>> | undefined

export function useDb() {
  if (!db) {
    const url = useRuntimeConfig().databaseUrl
    if (!url) throw new Error('NUXT_DATABASE_URL не задан — см. .env.example')
    db = drizzle(postgres(url), { schema })
  }
  return db
}
