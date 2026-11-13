// Галерея «Ресторана» из server/db/seed/gallery.json — картинки прототипа (restaurant.html)
// по категориям и с подписями на трёх языках. Пока у заказчицы нет своих фото; потом их
// заменяют в админке. Файлы — из public/images.
//
// Ничего не затирает: фото, уже заведённое этой задачей (media.source = seed:gallery/<файл>),
// пропускается; загруженные через админку не трогает. Категорию ищет по русскому названию —
// нет такой (переименовали или удалили) — фото пропускается с пометкой в отчёте.
//
// Запуск при работающем приложении:
//   curl -X POST 127.0.0.1:3000/_nitro/tasks/seed:gallery
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { and, eq, max } from 'drizzle-orm'
import data from '../../db/seed/gallery.json'
import {
  galleryCategoryTranslations,
  galleryPhotos,
  galleryPhotoTranslations,
  media,
} from '../../db/schema'
import { contentLocales, type ContentLocale } from '#shared/locales'

interface SeedPhoto {
  file: string
  category: string
  captions: Partial<Record<ContentLocale, string>>
}

export default defineTask({
  meta: {
    name: 'seed:gallery',
    description: 'Добавить в галерею картинки прототипа (уже добавленные — пропустить)',
  },
  async run() {
    const db = useDb()
    const added: string[] = []
    const skipped: string[] = []

    for (const photo of (data as { photos: SeedPhoto[] }).photos) {
      const source = `seed:gallery/${photo.file}`
      const [exists] = await db
        .select({ id: galleryPhotos.id })
        .from(galleryPhotos)
        .innerJoin(media, eq(media.id, galleryPhotos.mediaId))
        .where(eq(media.source, source))
        .limit(1)
      if (exists) {
        skipped.push(`${photo.file} — уже в галерее`)
        continue
      }
      const [category] = await db
        .select({ id: galleryCategoryTranslations.categoryId })
        .from(galleryCategoryTranslations)
        .where(
          and(
            eq(galleryCategoryTranslations.locale, 'ru'),
            eq(galleryCategoryTranslations.name, photo.category),
          ),
        )
        .limit(1)
      if (!category) {
        skipped.push(`${photo.file} — нет категории «${photo.category}»`)
        continue
      }

      // Без проверки размера: часть картинок прототипа маленькие (фото блюд 315×210)
      const buffer = await readFile(resolve('public/images', photo.file))
      const image = await saveImage(buffer, source, null, { minSide: 0 })
      await db.transaction(async (tx) => {
        const [last] = await tx.select({ value: max(galleryPhotos.sort) }).from(galleryPhotos)
        const [row] = await tx
          .insert(galleryPhotos)
          .values({ mediaId: image.id, categoryId: category.id, sort: (last?.value ?? -1) + 1 })
          .returning({ id: galleryPhotos.id })
        await tx
          .insert(galleryPhotoTranslations)
          .values(
            contentLocales
              .filter((l) => photo.captions[l])
              .map((locale) => ({ photoId: row!.id, locale, caption: photo.captions[locale]! })),
          )
      })
      added.push(photo.file)
    }

    const lines = [
      `Добавлено в галерею: ${added.length}${added.length ? ` (${added.join(', ')})` : ''}`,
      ...skipped.map((s) => `пропущено: ${s}`),
    ]
    return { result: lines.join('\n') }
  },
})
