// Материалы (5.7): новости, мероприятия, страницы. Что отдаёт сервер админке и что принимает,
// как выводится состояние на сайте. Схема проверки одна на сервер и форму.
import { z } from 'zod'
import { contentLocales, type ContentLocale } from './locales'
import { isDateString, isLocalDateTime, todayInTallinn } from './dates'
import type { Localized } from './menu'
import type { MediaImage } from './media'

export const materialTypes = ['event', 'news', 'page'] as const
export type MaterialType = (typeof materialTypes)[number]

export const materialTypeNames: Record<MaterialType, { one: string; many: string }> = {
  event: { one: 'Мероприятие', many: 'Мероприятия' },
  news: { one: 'Новость', many: 'Новости' },
  page: { one: 'Страница', many: 'Страницы' },
}

/** Что хранится: черновик, на сайте, в архиве */
export const materialStates = ['draft', 'published', 'archived'] as const
export type MaterialState = (typeof materialStates)[number]

/** Что видит гость и админка: «на сайте» с будущей датой — «запланировано» */
export const materialStatuses = ['published', 'planned', 'draft', 'archived'] as const
export type MaterialStatus = (typeof materialStatuses)[number]

export const materialStatusNames: Record<MaterialStatus, string> = {
  published: 'Опубликовано',
  planned: 'Запланировано',
  draft: 'Черновик',
  archived: 'В архиве',
}

/**
 * Состояние на сайте сейчас. Ничего не нужно переключать по расписанию:
 * запланированное выходит само, прошедшее мероприятие само уходит в архив.
 */
export function materialStatus(
  m: {
    state: MaterialState
    publishAt: string | null
    event: { date: string; archiveAfter: boolean } | null
  },
  now = new Date(),
): MaterialStatus {
  if (m.state !== 'published') return m.state
  if (m.publishAt && new Date(m.publishAt) > now) return 'planned'
  if (m.event?.archiveAfter && m.event.date < todayInTallinn(now)) return 'archived'
  return 'published'
}

// Вид мероприятия и место — списки из прототипа (admin/material.html). Подписи на трёх языках
// нужны сайту; станут справочником в админке, если списки начнут меняться
export const eventKinds = {
  concert: { et: 'Kontsert', en: 'Concert', ru: 'Концерт' },
  tour: { et: 'Ekskursioon', en: 'Tour', ru: 'Экскурсия' },
  lecture: { et: 'Loeng', en: 'Lecture', ru: 'Лекция' },
  workshop: { et: 'Töötuba', en: 'Workshop', ru: 'Мастер-класс' },
  literary: { et: 'Kirjandusõhtu', en: 'Literary evening', ru: 'Литературный вечер' },
} as const satisfies Record<string, Record<ContentLocale, string>>
export type EventKind = keyof typeof eventKinds

export const eventPlaces = {
  tavern: { et: 'Kõrts, esimene korrus', en: 'Tavern, ground floor', ru: 'Таверна, первый этаж' },
  hall: {
    et: 'Banketisaal, teine korrus',
    en: 'Banquet hall, upstairs',
    ru: 'Банкетный зал, второй этаж',
  },
  yard: { et: 'Hoov', en: 'Courtyard', ru: 'Двор' },
} as const satisfies Record<string, Record<ContentLocale, string>>
export type EventPlace = keyof typeof eventPlaces

/**
 * Начало адреса материала на сайте. Страницы лежат в корне языка — им нельзя брать адреса
 * разделов сайта (reservedPageSlugs).
 */
export function materialPath(type: MaterialType, locale: ContentLocale) {
  return type === 'news'
    ? `/${locale}/news/`
    : type === 'event'
      ? `/${locale}/events/`
      : `/${locale}/`
}

export const reservedPageSlugs = [
  'admin',
  'api',
  'uploads',
  'restaurant',
  'menu',
  'lunch',
  'banquet',
  'group',
  'about',
  'news',
  'events',
  'museum',
  'services',
  'contacts',
  'shop',
  'gallery',
  'authors',
] as const

// ---------- Что отдаёт сервер ----------

export interface AdminMaterialEvent {
  kind: EventKind | null
  date: string
  startTime: string | null
  place: EventPlace | null
  registrationOpen: boolean
  capacity: number | null
  archiveAfter: boolean
}

export interface AdminMaterialTranslation {
  title: string
  slug: string
  lead: string
  body: string
  priceNote: string
}

/** Строка списка */
export interface AdminMaterialRow {
  id: number
  type: MaterialType
  status: MaterialStatus
  /** Заголовок и адрес — на русском, если есть, иначе на эстонском или любом */
  title: string
  slug: string
  publishAt: string | null
  updatedAt: string
  /** Где показывать */
  locales: ContentLocale[]
  /** На каких языках есть перевод */
  translated: ContentLocale[]
  event: { date: string; startTime: string | null } | null
}

export interface AdminMaterial {
  id: number
  type: MaterialType
  state: MaterialState
  status: MaterialStatus
  /** Дата выхода по Таллину, «2026-11-03T09:00» — для поля формы */
  publishAt: string | null
  locales: ContentLocale[]
  cover: MediaImage | null
  translations: Localized<AdminMaterialTranslation>
  event: AdminMaterialEvent | null
  createdAt: string
  updatedAt: string
  updatedByName: string | null
}

export interface AdminMaterialsList {
  materials: AdminMaterialRow[]
  /** Раздел «Новости» включён на сайте (настройки сайта) */
  newsEnabled: boolean
}

// ---------- Что принимает сервер ----------

export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const translationSchema = z.object({
  title: z.string().trim().max(200, 'Заголовок — не длиннее 200 знаков'),
  // Пустой адрес сервер соберёт из заголовка
  slug: z
    .string()
    .trim()
    .max(80, 'Адрес — не длиннее 80 знаков')
    .refine((s) => s === '' || slugPattern.test(s), 'Адрес — латиница, цифры и дефисы'),
  lead: z.string().trim().max(300, 'Коротко — не длиннее 300 знаков'),
  body: z.string().max(200_000, 'Текст слишком длинный'),
  priceNote: z.string().trim().max(200),
})

const eventSchema = z.object({
  kind: z.enum(Object.keys(eventKinds) as [EventKind, ...EventKind[]]).nullable(),
  date: z.string().refine(isDateString, 'Укажите дату мероприятия'),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Время в виде ЧЧ:ММ')
    .nullable(),
  place: z.enum(Object.keys(eventPlaces) as [EventPlace, ...EventPlace[]]).nullable(),
  registrationOpen: z.boolean(),
  capacity: z.number().int().min(1, 'Мест — хотя бы одно').max(10_000).nullable(),
  archiveAfter: z.boolean(),
})

export const materialInputSchema = z
  .object({
    type: z.enum(materialTypes),
    state: z.enum(materialStates),
    publishAt: z.string().refine(isLocalDateTime, 'Неверная дата публикации').nullable(),
    locales: z.array(z.enum(contentLocales)).max(3),
    coverId: z.uuid().nullable(),
    translations: z.partialRecord(z.enum(contentLocales), translationSchema),
    event: eventSchema.nullable(),
  })
  .refine((m) => Object.values(m.translations).some((t) => t?.title), {
    message: 'Нужен заголовок хотя бы на одном языке',
    path: ['translations'],
  })
  .refine((m) => (m.type === 'event') === !!m.event, {
    message: 'Дата и место — только у мероприятия',
    path: ['event'],
  })
export type MaterialInput = z.infer<typeof materialInputSchema>

export const materialLocalesSchema = z.object({ locales: z.array(z.enum(contentLocales)).max(3) })
