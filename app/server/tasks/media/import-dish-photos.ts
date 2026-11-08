// Перенос старых фото блюд к нам: скачать по ссылке (сейчас — со старого сайта peetritoll.ee),
// уменьшить, сохранить в media и привязать к блюду. Ссылку после этого убираем.
// Повторный запуск берёт только то, что ещё не перенесено. Неудачные — в отчёте, ссылка остаётся.
//
// Запуск при работающем приложении:
//   docker compose exec app npx nuxi task run media:import-dish-photos
import { and, eq, isNotNull, isNull } from 'drizzle-orm'
import { dishes } from '../../db/schema'

const TIMEOUT_MS = 20_000

export default defineTask({
  meta: {
    name: 'media:import-dish-photos',
    description: 'Скачать фото блюд по старым ссылкам и хранить у себя',
  },
  async run() {
    const db = useDb()
    const todo = await db
      .select({ id: dishes.id, url: dishes.photo })
      .from(dishes)
      .where(and(isNotNull(dishes.photo), isNull(dishes.photoId)))

    const failed: string[] = []
    let done = 0
    for (const dish of todo) {
      try {
        if (!/^https?:\/\//.test(dish.url!)) throw new Error('не http-ссылка')
        const response = await fetch(dish.url!, { signal: AbortSignal.timeout(TIMEOUT_MS) })
        if (!response.ok) throw new Error(`ответ ${response.status}`)
        // Без проверки размера: на старом сайте фото 315×210. Админка предупредит, что маленькое
        const image = await saveImage(Buffer.from(await response.arrayBuffer()), dish.url, null, {
          minSide: 0,
        })
        await db
          .update(dishes)
          .set({ photoId: image.id, photo: null })
          .where(eq(dishes.id, dish.id))
        done++
      } catch (e) {
        const reason = (e as { message?: string }).message ?? String(e)
        failed.push(`блюдо ${dish.id}: ${reason} (${dish.url})`)
      }
    }

    const lines = [
      `Перенесено фото: ${done} из ${todo.length}`,
      ...failed.map((f) => `не вышло — ${f}`),
    ]
    return { result: lines.join('\n') }
  },
})
