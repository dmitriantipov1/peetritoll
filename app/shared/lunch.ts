// Дневное меню (7.1): что отдаёт сервер админке и что принимает. Одна схема zod на сервер и форму.
import { z } from 'zod'
import { contentLocales } from './locales'
import { isDateString } from './dates'
import type { Localized } from './menu'

/** Будни, на которые заводится меню дня: пн–пт */
export const LUNCH_WEEKDAYS = 5

export interface AdminLunchDay {
  date: string
  translations: Localized<{ soup: string | null; main: string | null }>
  soupCents: number | null
  mainCents: number | null
  fullCents: number | null
}

export interface LunchSettings {
  /** Показывать меню дня на сайте (страница «Меню дня» и кнопка в «Меню») */
  visible: boolean
  /** Принимать предзаказ на сайте */
  acceptPreorders: boolean
  /** Часы подачи «ЧЧ:ММ» */
  servedFrom: string
  servedTo: string
  /** Предзаказ на сегодня — до этого времени, «ЧЧ:ММ» */
  preorderUntil: string
  /** Что входит в обед целиком: «Суп, горячее, морс или компот» */
  includes: Localized<string>
}

export const defaultLunchSettings: LunchSettings = {
  visible: true,
  acceptPreorders: true,
  servedFrom: '12:00',
  servedTo: '15:00',
  preorderUntil: '11:00',
  includes: { ru: 'Суп, горячее, морс или компот' },
}

export interface AdminLunchWeek {
  /** Понедельник недели */
  monday: string
  /** Сегодня по Таллину — чтобы отметить прошедшие дни и сегодняшний */
  today: string
  days: AdminLunchDay[]
  settings: LunchSettings
}

// ---------- Проверка ----------

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Время в виде ЧЧ:ММ, например 12:00')
const dateString = z.string().refine(isDateString, 'Неверная дата')
const cents = z.number().int().min(0).max(100_000).nullable()
const dish = z.string().trim().max(200).nullable()

export const lunchDayInputSchema = z
  .object({
    date: dateString,
    translations: z.partialRecord(z.enum(contentLocales), z.object({ soup: dish, main: dish })),
    soupCents: cents,
    mainCents: cents,
    fullCents: cents,
  })
  .refine((d) => !Object.values(d.translations).some((t) => t?.soup) || d.soupCents !== null, {
    message: 'У супа нужна цена',
    path: ['soupCents'],
  })
  .refine((d) => !Object.values(d.translations).some((t) => t?.main) || d.mainCents !== null, {
    message: 'У горячего нужна цена',
    path: ['mainCents'],
  })
  .refine(
    (d) =>
      d.fullCents === null ||
      (Object.values(d.translations).some((t) => t?.soup) &&
        Object.values(d.translations).some((t) => t?.main)),
    { message: 'Обед целиком — только когда есть и суп, и горячее', path: ['fullCents'] },
  )

export const lunchWeekInputSchema = z.object({
  monday: dateString,
  days: z.array(lunchDayInputSchema).max(LUNCH_WEEKDAYS),
})
export type LunchWeekInput = z.infer<typeof lunchWeekInputSchema>

export const lunchSettingsSchema = z
  .object({
    visible: z.boolean(),
    acceptPreorders: z.boolean(),
    servedFrom: time,
    servedTo: time,
    preorderUntil: time,
    includes: z.partialRecord(z.enum(contentLocales), z.string().trim().max(200)),
  })
  .refine((s) => s.servedFrom < s.servedTo, {
    message: 'Конец подачи — позже начала',
    path: ['servedTo'],
  })
  .refine((s) => s.preorderUntil <= s.servedTo, {
    message: 'Предзаказ на сегодня должен закрываться не позже конца подачи',
    path: ['preorderUntil'],
  })
