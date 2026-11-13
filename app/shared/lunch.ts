// Дневное меню (7.1): что отдаёт сервер админке и что принимает. Одна схема zod на сервер и форму.
import { z } from 'zod'
import { contentLocales } from './locales'
import { addDays, isDateString, weekday } from './dates'
import type { Localized } from './menu'

/** Будни, на которые заводится меню дня: пн–пт */
export const LUNCH_WEEKDAYS = 5

export interface AdminLunchDay {
  date: string
  translations: Localized<{ soup: string | null; main: string | null }>
  soupCents: number | null
  mainCents: number | null
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
}

export const defaultLunchSettings: LunchSettings = {
  visible: true,
  acceptPreorders: true,
  servedFrom: '12:00',
  servedTo: '15:00',
  preorderUntil: '11:00',
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
  })
  .refine((d) => !Object.values(d.translations).some((t) => t?.soup) || d.soupCents !== null, {
    message: 'У супа нужна цена',
    path: ['soupCents'],
  })
  .refine((d) => !Object.values(d.translations).some((t) => t?.main) || d.mainCents !== null, {
    message: 'У горячего нужна цена',
    path: ['mainCents'],
  })

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
  })
  .refine((s) => s.servedFrom < s.servedTo, {
    message: 'Конец подачи — позже начала',
    path: ['servedTo'],
  })
  .refine((s) => s.preorderUntil <= s.servedTo, {
    message: 'Предзаказ на сегодня должен закрываться не позже конца подачи',
    path: ['preorderUntil'],
  })

// ---------- Правила предзаказа (7.1, 07.11.2026) ----------
// Одни и те же для формы на сайте и для проверки на сервере: форма может быть открыта со вчерашнего дня.

type PreorderRules = Pick<LunchSettings, 'servedFrom' | 'servedTo' | 'preorderUntil'>

/** Шаг времени прихода в форме, минут */
export const PREORDER_STEP = 30

/**
 * На какие дни можно заказать сейчас: только сегодня и завтра, если это будни;
 * на сегодня — до крайнего срока предзаказа. Есть ли меню на день, проверяется отдельно.
 * В пятницу — только сегодня, в субботу — никуда, в воскресенье — на понедельник.
 */
export function preorderDates(today: string, now: string, rules: PreorderRules): string[] {
  const dates: string[] = []
  if (weekday(today) <= LUNCH_WEEKDAYS && now < rules.preorderUntil) dates.push(today)
  const tomorrow = addDays(today, 1)
  if (weekday(tomorrow) <= LUNCH_WEEKDAYS) dates.push(tomorrow)
  return dates
}

/**
 * Время прихода: каждые полчаса в часы подачи, последнее — за полчаса до конца.
 * На сегодня — только то, что ещё не прошло.
 */
export function preorderTimes(
  date: string,
  today: string,
  now: string,
  rules: PreorderRules,
): string[] {
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
  const toTime = (m: number) =>
    `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
  const times: string[] = []
  for (let m = toMin(rules.servedFrom); m < toMin(rules.servedTo); m += PREORDER_STEP) {
    const t = toTime(m)
    if (date !== today || t > now) times.push(t)
  }
  return times
}
