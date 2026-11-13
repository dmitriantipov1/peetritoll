// Мероприятия на сайте: блок «Предстоящие / Архив» и страница мероприятия.
// Раздел «Мероприятия» выключен или скрыт на этом языке — ничего (null). Что показывать, решают
// те же правила, что в админке: языки показа (8.5) и состояние материала (materialStatus) —
// запланированное ещё не видно, прошедшее с отметкой «в архив» — в архиве.
// Доступно в серверном коде без импорта.
import { and, arrayContains, eq } from 'drizzle-orm'
import { materials, media } from '../db/schema'
import type { SiteEvent, SiteEventPage, SiteEvents } from '#shared/site-events'
import { contentLocales, pickTranslation, type ContentLocale } from '#shared/locales'
import { toMediaImage } from '#shared/media'
import { defaultEvents, eventsSchema } from '#shared/site-settings'
import { eventKinds, eventPlaces, eventPlacesLeft, materialStatus } from '#shared/materials'
import { todayInTallinn } from '#shared/dates'

async function eventsShown(locale: ContentLocale) {
  const { events } = await readSections()
  return events.enabled && events.locales[locale]
}

/** Опубликованные мероприятия этого языка со статусом на сайте; запланированных нет */
async function visibleEvents(locale: ContentLocale) {
  const db = useDb()
  const settings = await readSetting('events', eventsSchema, defaultEvents)
  const [rows, defaultPoster] = await Promise.all([
    db.query.materials.findMany({
      where: and(
        eq(materials.type, 'event'),
        eq(materials.state, 'published'),
        arrayContains(materials.locales, [locale]),
      ),
      with: { translations: true, event: true, cover: true },
    }),
    settings.defaultPosterId
      ? db.query.media.findFirst({ where: eq(media.id, settings.defaultPosterId) })
      : undefined,
  ])
  const fallbackPoster = defaultPoster ? toMediaImage(defaultPoster) : null
  const list = rows.flatMap((m) => {
    if (!m.event || !m.translations.length) return []
    const status = materialStatus({
      state: m.state,
      publishAt: m.publishAt?.toISOString() ?? null,
      event: m.event,
    })
    if (status === 'planned') return []
    const t = pickTranslation(m.translations, locale)!
    const item: SiteEvent = {
      slug: t.slug,
      title: t.title,
      lead: t.lead,
      date: m.event.date,
      startTime: m.event.startTime,
      kind: m.event.kind ? eventKinds[m.event.kind][locale] : null,
      priceNote: t.priceNote,
      poster: m.cover ? toMediaImage(m.cover) : fallbackPoster,
      registrationOpen: m.event.registrationOpen,
    }
    return [{ m, t, item, archived: status === 'archived' }]
  })
  return { list, rotateSeconds: settings.rotateSeconds }
}

const byDate = (a: SiteEvent, b: SiteEvent) =>
  a.date.localeCompare(b.date) || (a.startTime ?? '').localeCompare(b.startTime ?? '')

/** Блок «Предстоящие / Архив»; archiveLimit — сколько прошедших показать (на главной — несколько) */
export async function loadSiteEvents(
  locale: ContentLocale,
  archiveLimit?: number,
): Promise<SiteEvents | null> {
  if (!(await eventsShown(locale))) return null
  const { list, rotateSeconds } = await visibleEvents(locale)
  const upcoming = list.filter((e) => !e.archived).map((e) => e.item)
  const archive = list.filter((e) => e.archived).map((e) => e.item)
  upcoming.sort(byDate)
  archive.sort((a, b) => byDate(b, a))
  return { rotateSeconds, upcoming, archive: archive.slice(0, archiveLimit) }
}

export async function loadSiteEvent(
  locale: ContentLocale,
  slug: string,
): Promise<SiteEventPage | null> {
  if (!(await eventsShown(locale))) return null
  const { list } = await visibleEvents(locale)
  // Адрес на языке страницы; не нашли — мероприятие без перевода, адрес — по показанному языку
  const hit =
    list.find((e) => e.m.translations.some((t) => t.locale === locale && t.slug === slug)) ??
    list.find((e) => e.item.slug === slug)
  if (!hit) return null
  const { m, t, item, archived } = hit
  // Прошедшее — без записи, даже если её забыли закрыть (и если «в архив» не отмечено)
  const registrationOpen = item.registrationOpen && !archived && item.date >= todayInTallinn()
  return {
    ...item,
    id: m.id,
    registrationOpen,
    placesLeft: registrationOpen
      ? eventPlacesLeft(m.event!.capacity, await eventPlacesTaken(useDb(), m.id))
      : null,
    body: t.body,
    place: m.event!.place ? eventPlaces[m.event!.place][locale] : null,
    archived,
    slugs: Object.fromEntries(
      contentLocales
        .filter((l) => m.locales.includes(l))
        .map((l) => [l, pickTranslation(m.translations, l)!.slug]),
    ),
  }
}
