// Обложки книг издательства из SumUp-магазина заказчицы (peetritoll.sumupstore.com) — к себе:
// скачать, уменьшить, сохранить в media и поставить первым фото книги. Книга ищется по русскому
// адресу (как в seed:shop). Книгу, у которой фото уже есть, не трогаем — повторный запуск безопасен.
//
// Запуск при работающем приложении:
//   docker compose exec app npx nuxi task run media:import-book-covers
import { and, eq } from 'drizzle-orm'
import { productPhotos, productTranslations } from '../../db/schema'

const TIMEOUT_MS = 20_000

/** Русский адрес книги → картинка в SumUp */
const covers: Record<string, string> = {
  'bayki-iz-za-barnoy-stoyki': 'img_4JCFJXNJ6H8B4ADHSJG1KQHB3D',
  'byloy-paldiski-i-ego-lyudi': 'img_0G8BBCKVBM95NVYTSNS180BZCS',
  'moy-rodnoy-paldiski': 'img_229JGJ4Q7E80YRH6Y3C8VABYNE',
  'lood-baarileti-tagant': 'img_6N5M8Y9MW39WGRC52XJ7V3XP7V',
  'kodulinn-paldiski': 'img_4N8FJBPZDW80ATF832FR3HD759',
}

export default defineTask({
  meta: {
    name: 'media:import-book-covers',
    description: 'Скачать обложки книг из SumUp-магазина и поставить их книгам',
  },
  async run() {
    const db = useDb()
    const lines: string[] = []
    let done = 0
    for (const [slug, imageId] of Object.entries(covers)) {
      const url = `https://images.sumup.com/${imageId}/image.png`
      try {
        const [book] = await db
          .select({ id: productTranslations.productId })
          .from(productTranslations)
          .where(and(eq(productTranslations.locale, 'ru'), eq(productTranslations.slug, slug)))
        if (!book) throw new Error('книги с таким адресом нет')
        const has = await db
          .select({ id: productPhotos.mediaId })
          .from(productPhotos)
          .where(eq(productPhotos.productId, book.id))
        if (has.length) {
          lines.push(`${slug}: фото уже есть — пропущено`)
          continue
        }
        const response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
        if (!response.ok) throw new Error(`ответ ${response.status}`)
        // Обложки в SumUp бывают меньше 800 px — админка предупредит, что маленькая
        const image = await saveImage(Buffer.from(await response.arrayBuffer()), url, null, {
          minSide: 0,
        })
        await db.insert(productPhotos).values({ productId: book.id, mediaId: image.id, sort: 0 })
        done++
      } catch (e) {
        lines.push(`не вышло — ${slug}: ${(e as { message?: string }).message ?? String(e)}`)
      }
    }
    return {
      result: [`Обложек поставлено: ${done} из ${Object.keys(covers).length}`, ...lines].join('\n'),
    }
  },
})
