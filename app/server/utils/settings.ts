// Настройки сайта «ключ → значение» (таблица settings). Доступно в серверном коде без импорта.
// Значение всегда проходит через схему: в базе могло остаться старое или неполное —
// тогда недостающее берём из значения по умолчанию.
import { eq } from 'drizzle-orm'
import type { z } from 'zod'
import { settings } from '../db/schema'

export async function readSetting<T>(key: string, schema: z.ZodType<T>, fallback: T): Promise<T> {
  const [row] = await useDb().select().from(settings).where(eq(settings.key, key))
  if (!row) return fallback
  const merged = { ...fallback, ...(row.value as object) }
  const parsed = schema.safeParse(merged)
  return parsed.success ? parsed.data : fallback
}

export async function writeSetting(key: string, value: unknown, userId: number) {
  await useDb()
    .insert(settings)
    .values({ key, value, updatedBy: userId })
    .onConflictDoUpdate({ target: settings.key, set: { value, updatedBy: userId } })
}
