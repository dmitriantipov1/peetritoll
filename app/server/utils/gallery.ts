// Галерея: список для админки, фото и категории. Доступно в серверном коде без импорта.
import { asc, count, eq, max } from 'drizzle-orm'
import {
  galleryCategories,
  galleryCategoryTranslations,
  galleryPhotos,
  galleryPhotoTranslations,
  media,
} from '../db/schema'
import type { AdminGallery, GalleryPhotoInput } from '#shared/gallery'
import type { ContentLocale } from '#shared/locales'
import type { Localized } from '#shared/menu'
import { toMediaImage } from '#shared/media'

function byLocale<R extends { locale: ContentLocale }>(rows: R[], value: (row: R) => string) {
  const result: Localized<string> = {}
  for (const row of rows) result[row.locale] = value(row)
  return result
}

/** Строки перевода; пустые не сохраняем — на сайте покажем эстонский текст */
function localeRows(values: Localized<string>) {
  return Object.entries(values)
    .filter(([, text]) => text)
    .map(([locale, text]) => ({ locale: locale as ContentLocale, text: text! }))
}

export async function loadAdminGallery(): Promise<AdminGallery> {
  const db = useDb()
  const [categories, photos] = await Promise.all([
    db.query.galleryCategories.findMany({
      with: { translations: true },
      orderBy: [asc(galleryCategories.sort), asc(galleryCategories.id)],
    }),
    db.query.galleryPhotos.findMany({
      with: { translations: true, media: true },
      orderBy: [asc(galleryPhotos.sort), asc(galleryPhotos.id)],
    }),
  ])
  return {
    categories: categories.map((c) => ({
      id: c.id,
      names: byLocale(c.translations, (t) => t.name),
    })),
    photos: photos.map((p) => ({
      id: p.id,
      categoryId: p.categoryId,
      image: toMediaImage(p.media),
      isVisible: p.isVisible,
      captions: byLocale(p.translations, (t) => t.caption),
    })),
  }
}

async function requireCategory(id: number) {
  const [row] = await useDb()
    .select({ id: galleryCategories.id })
    .from(galleryCategories)
    .where(eq(galleryCategories.id, id))
  if (!row) throw createError({ statusCode: 400, message: 'Нет такой категории' })
}

// ---------- Фото ----------

/** Новое фото — в конец галереи, без подписи: подпись добавляют в карточке справа */
export async function addGalleryPhoto(mediaId: string, categoryId: number, userId: number) {
  await requireCategory(categoryId)
  const db = useDb()
  const [found] = await db.select({ id: media.id }).from(media).where(eq(media.id, mediaId))
  if (!found) throw createError({ statusCode: 400, message: 'Фото не найдено — загрузите заново' })
  const [last] = await db.select({ value: max(galleryPhotos.sort) }).from(galleryPhotos)
  const [row] = await db
    .insert(galleryPhotos)
    .values({ mediaId, categoryId, sort: (last?.value ?? -1) + 1, updatedBy: userId })
    .returning({ id: galleryPhotos.id })
  return row!.id
}

export async function updateGalleryPhoto(id: number, input: GalleryPhotoInput, userId: number) {
  await requireCategory(input.categoryId)
  await useDb().transaction(async (tx) => {
    const [row] = await tx
      .update(galleryPhotos)
      .set({ categoryId: input.categoryId, isVisible: input.isVisible, updatedBy: userId })
      .where(eq(galleryPhotos.id, id))
      .returning({ id: galleryPhotos.id })
    if (!row) throw createError({ statusCode: 404, message: 'Фото не найдено' })
    await tx.delete(galleryPhotoTranslations).where(eq(galleryPhotoTranslations.photoId, id))
    const rows = localeRows(input.captions)
    if (rows.length) {
      await tx
        .insert(galleryPhotoTranslations)
        .values(rows.map((r) => ({ locale: r.locale, caption: r.text, photoId: id })))
    }
  })
}

export async function deleteGalleryPhoto(id: number) {
  const [row] = await useDb()
    .delete(galleryPhotos)
    .where(eq(galleryPhotos.id, id))
    .returning({ id: galleryPhotos.id })
  if (!row) throw createError({ statusCode: 404, message: 'Фото не найдено' })
}

// ---------- Категории ----------

export async function createGalleryCategory(names: Localized<string>) {
  return await useDb().transaction(async (tx) => {
    const [last] = await tx.select({ value: max(galleryCategories.sort) }).from(galleryCategories)
    const [row] = await tx
      .insert(galleryCategories)
      .values({ sort: (last?.value ?? -1) + 1 })
      .returning({ id: galleryCategories.id })
    await tx
      .insert(galleryCategoryTranslations)
      .values(
        localeRows(names).map((r) => ({ locale: r.locale, name: r.text, categoryId: row!.id })),
      )
    return row!.id
  })
}

export async function updateGalleryCategory(id: number, names: Localized<string>) {
  await useDb().transaction(async (tx) => {
    const [row] = await tx
      .update(galleryCategories)
      .set({ updatedAt: new Date() })
      .where(eq(galleryCategories.id, id))
      .returning({ id: galleryCategories.id })
    if (!row) throw createError({ statusCode: 404, message: 'Категория не найдена' })
    await tx
      .delete(galleryCategoryTranslations)
      .where(eq(galleryCategoryTranslations.categoryId, id))
    await tx
      .insert(galleryCategoryTranslations)
      .values(localeRows(names).map((r) => ({ locale: r.locale, name: r.text, categoryId: id })))
  })
}

/** Удалить можно только пустую категорию */
export async function deleteGalleryCategory(id: number) {
  const db = useDb()
  const [used] = await db
    .select({ n: count() })
    .from(galleryPhotos)
    .where(eq(galleryPhotos.categoryId, id))
  if (used && used.n > 0) {
    throw createError({
      statusCode: 409,
      message: `В категории ${used.n} фото. Перенесите их в другую категорию или удалите, потом удаляйте категорию.`,
    })
  }
  const [row] = await db
    .delete(galleryCategories)
    .where(eq(galleryCategories.id, id))
    .returning({ id: galleryCategories.id })
  if (!row) throw createError({ statusCode: 404, message: 'Категория не найдена' })
}
