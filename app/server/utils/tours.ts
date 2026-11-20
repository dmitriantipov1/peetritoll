// Экскурсионные программы (20.11.2026): список для админки, сохранение, «на сайте», порядок,
// удаление и выдача на сайт. Доступно в серверном коде без импорта.
import { asc, eq, max } from 'drizzle-orm'
import { media, tours, tourTranslations } from '../db/schema'
import type { AdminTour, SiteTour, TourInput, TourRef } from '#shared/tours'
import type { Localized } from '#shared/menu'
import { pickTranslation, type ContentLocale } from '#shared/locales'
import { toMediaImage } from '#shared/media'

type Db = ReturnType<typeof useDb>
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

type TourRow = typeof tours.$inferSelect & {
  translations: (typeof tourTranslations.$inferSelect)[]
  photo: typeof media.$inferSelect | null
}

const withAll = { translations: true, photo: true } as const

function toAdmin(row: TourRow): AdminTour {
  const pick = (key: 'title' | 'text' | 'duration' | 'terms') =>
    Object.fromEntries(
      row.translations.filter((t) => t[key]).map((t) => [t.locale, t[key]]),
    ) as Localized<string>
  return {
    id: row.id,
    isVisible: row.isVisible,
    priceCents: row.priceCents,
    priceUnit: row.priceUnit,
    minPeople: row.minPeople,
    guide: row.guide,
    languages: row.languages,
    photo: row.photo ? toMediaImage(row.photo) : null,
    legacyPhoto: row.legacyPhoto,
    titles: pick('title'),
    texts: pick('text'),
    durations: pick('duration'),
    terms: pick('terms'),
  }
}

export async function loadTours(): Promise<AdminTour[]> {
  const rows = await useDb().query.tours.findMany({
    orderBy: [asc(tours.sort), asc(tours.id)],
    with: withAll,
  })
  return rows.map(toAdmin)
}

/** Программа для заявки: есть и показывается на сайте — название снимком; нет — null */
export async function findTourRef(id: number, onlyVisible: boolean): Promise<TourRef | null> {
  const row = await useDb().query.tours.findFirst({
    where: eq(tours.id, id),
    with: withAll,
  })
  if (!row || (onlyVisible && !row.isVisible)) return null
  return { id: row.id, titles: toAdmin(row).titles }
}

async function replaceTexts(tx: Tx, id: number, input: TourInput) {
  await tx.delete(tourTranslations).where(eq(tourTranslations.tourId, id))
  // Язык без названия не сохраняем — карточку без названия гостю не показать
  const rows = Object.entries(input.titles)
    .filter(([, title]) => title)
    .map(([l, title]) => {
      const locale = l as ContentLocale
      return {
        tourId: id,
        locale,
        title: title!,
        text: input.texts[locale] || null,
        duration: input.durations[locale] || null,
        terms: input.terms[locale] || null,
      }
    })
  await tx.insert(tourTranslations).values(rows)
}

/** Создать (id = null) или сохранить программу. Новая — в конец списка. Возвращает id */
export async function saveTour(id: number | null, input: TourInput, userId: number) {
  return await useDb().transaction(async (tx) => {
    if (input.photoId) {
      const [found] = await tx
        .select({ id: media.id })
        .from(media)
        .where(eq(media.id, input.photoId))
      if (!found)
        throw createError({ statusCode: 400, message: 'Фото не найдено — загрузите заново' })
    }
    const fields = {
      isVisible: input.isVisible,
      priceCents: input.priceCents,
      priceUnit: input.priceUnit,
      minPeople: input.minPeople,
      guide: input.guide,
      languages: [...new Set(input.languages)],
      photoId: input.photoId,
      // Загрузили новое фото — старая картинка больше не нужна
      legacyPhoto: input.photoId ? null : input.legacyPhoto,
      updatedBy: userId,
    }
    if (id === null) {
      const [last] = await tx.select({ value: max(tours.sort) }).from(tours)
      const [row] = await tx
        .insert(tours)
        .values({ ...fields, sort: (last?.value ?? -1) + 1 })
        .returning({ id: tours.id })
      await replaceTexts(tx, row!.id, input)
      return row!.id
    }
    const [row] = await tx
      .update(tours)
      .set(fields)
      .where(eq(tours.id, id))
      .returning({ id: tours.id })
    if (!row) throw createError({ statusCode: 404, message: 'Программа не найдена' })
    await replaceTexts(tx, id, input)
    return id
  })
}

export async function setTourVisibility(id: number, isVisible: boolean, userId: number) {
  const [row] = await useDb()
    .update(tours)
    .set({ isVisible, updatedBy: userId })
    .where(eq(tours.id, id))
    .returning({ id: tours.id })
  if (!row) throw createError({ statusCode: 404, message: 'Программа не найдена' })
}

/** Удаление не трогает заявки: в них программа снимком — название на момент отправки */
export async function deleteTour(id: number) {
  const [row] = await useDb().delete(tours).where(eq(tours.id, id)).returning({ id: tours.id })
  if (!row) throw createError({ statusCode: 404, message: 'Программа не найдена' })
}

/** Программы «на сайте» в порядке из админки, тексты — на языке страницы (иначе эстонский) */
export async function loadSiteTours(locale: ContentLocale): Promise<SiteTour[]> {
  const rows = await useDb().query.tours.findMany({
    where: eq(tours.isVisible, true),
    orderBy: [asc(tours.sort), asc(tours.id)],
    with: withAll,
  })
  return rows.flatMap((row) => {
    const tr = pickTranslation(row.translations, locale)
    if (!tr) return []
    return [
      {
        id: row.id,
        title: tr.title,
        text: tr.text ?? '',
        duration: tr.duration ?? '',
        terms: tr.terms ?? '',
        priceCents: row.priceCents,
        priceUnit: row.priceUnit,
        minPeople: row.minPeople,
        guide: row.guide,
        languages: row.languages,
        photo: row.photo ? toMediaImage(row.photo) : null,
        legacyPhoto: row.photo ? null : row.legacyPhoto,
      },
    ]
  })
}
