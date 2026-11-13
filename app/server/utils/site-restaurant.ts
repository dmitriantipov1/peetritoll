// Страница «Ресторан»: галерея из базы и включённые разделы. Раздел «Ресторан» выключен
// или скрыт на этом языке — страницы нет (null). Доступно в серверном коде без импорта.
import { asc, eq } from 'drizzle-orm'
import { galleryCategories, galleryPhotos } from '../db/schema'
import type { SiteGallery, SiteRestaurant } from '#shared/site-restaurant'
import { pickTranslation, type ContentLocale } from '#shared/locales'
import { toMediaImage } from '#shared/media'

async function loadSiteGallery(locale: ContentLocale): Promise<SiteGallery | null> {
  const db = useDb()
  const [categories, photos] = await Promise.all([
    db.query.galleryCategories.findMany({
      with: { translations: true },
      orderBy: [asc(galleryCategories.sort), asc(galleryCategories.id)],
    }),
    db.query.galleryPhotos.findMany({
      where: eq(galleryPhotos.isVisible, true),
      with: { translations: true, media: true },
      orderBy: [asc(galleryPhotos.sort), asc(galleryPhotos.id)],
    }),
  ])
  if (!photos.length) return null
  const used = new Set(photos.map((p) => p.categoryId))
  return {
    categories: categories
      .filter((c) => used.has(c.id))
      .map((c) => ({ id: c.id, name: pickTranslation(c.translations, locale)?.name ?? '' })),
    photos: photos.map((p) => ({
      id: p.id,
      categoryId: p.categoryId,
      image: toMediaImage(p.media),
      caption: pickTranslation(p.translations, locale)?.caption ?? '',
    })),
  }
}

export async function loadSiteRestaurant(locale: ContentLocale): Promise<SiteRestaurant | null> {
  const sections = await readSections()
  const shown = (key: keyof typeof sections) =>
    sections[key].enabled && sections[key].locales[locale]
  if (!shown('restaurant')) return null
  return {
    gallery: shown('gallery') ? await loadSiteGallery(locale) : null,
    links: { menu: shown('menu'), banquet: shown('banquet'), group: shown('group') },
  }
}
