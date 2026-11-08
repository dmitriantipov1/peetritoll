// Дневное меню: неделя для админки, сохранение недели, копия прошлой недели, настройки.
// Доступно в серверном коде без импорта.
import { and, between, eq, inArray } from 'drizzle-orm'
import { lunchDays, lunchDayTranslations } from '../db/schema'
import {
  defaultLunchSettings,
  LUNCH_WEEKDAYS,
  lunchSettingsSchema,
  type AdminLunchDay,
  type AdminLunchWeek,
  type LunchSettings,
  type LunchWeekInput,
} from '#shared/lunch'
import { addDays, isDateString, mondayOf, todayInTallinn, weekday } from '#shared/dates'
import type { ContentLocale } from '#shared/locales'

type Db = ReturnType<typeof useDb>
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

export const LUNCH_SETTINGS_KEY = 'lunch'

export function readLunchSettings(): Promise<LunchSettings> {
  return readSetting(LUNCH_SETTINGS_KEY, lunchSettingsSchema, defaultLunchSettings)
}

/**
 * Понедельник из ?week=…; любой день недели приводим к её понедельнику.
 * Без параметра — текущая неделя, а в субботу и воскресенье — следующая:
 * будни этой уже прошли, заводить меню нужно на ближайшие.
 */
export function weekParam(value: unknown): string {
  if (isDateString(value)) return mondayOf(value)
  const today = todayInTallinn()
  return mondayOf(weekday(today) >= 6 ? addDays(today, 7) : today)
}

/** Даты будних дней недели: пн–пт */
function weekDates(monday: string) {
  return Array.from({ length: LUNCH_WEEKDAYS }, (_, i) => addDays(monday, i))
}

async function loadDays(db: Db | Tx, from: string, to: string): Promise<AdminLunchDay[]> {
  const rows = await db
    .select()
    .from(lunchDays)
    .where(between(lunchDays.date, from, to))
  if (!rows.length) return []
  const texts = await db
    .select()
    .from(lunchDayTranslations)
    .where(
      inArray(
        lunchDayTranslations.date,
        rows.map((r) => r.date),
      ),
    )
  return rows.map((r) => ({
    date: r.date,
    soupCents: r.soupCents,
    mainCents: r.mainCents,
    fullCents: r.fullCents,
    translations: Object.fromEntries(
      texts.filter((t) => t.date === r.date).map((t) => [t.locale, { soup: t.soup, main: t.main }]),
    ),
  }))
}

export async function loadLunchWeek(monday: string): Promise<AdminLunchWeek> {
  const dates = weekDates(monday)
  const days = await loadDays(useDb(), dates[0]!, dates[dates.length - 1]!)
  return {
    monday,
    today: todayInTallinn(),
    days,
    settings: await readLunchSettings(),
  }
}

/** Есть ли в дне хоть одно блюдо */
function hasDishes(day: LunchWeekInput['days'][number]) {
  return Object.values(day.translations).some((t) => t?.soup || t?.main)
}

async function writeDay(tx: Tx, day: LunchWeekInput['days'][number], userId: number) {
  await tx.delete(lunchDays).where(eq(lunchDays.date, day.date))
  if (!hasDishes(day)) return // пустой день — меню на этот день нет
  await tx.insert(lunchDays).values({
    date: day.date,
    soupCents: day.soupCents,
    mainCents: day.mainCents,
    fullCents: day.fullCents,
    updatedBy: userId,
  })
  const texts = Object.entries(day.translations)
    .filter(([, t]) => t?.soup || t?.main)
    .map(([locale, t]) => ({
      date: day.date,
      locale: locale as ContentLocale,
      soup: t!.soup || null,
      main: t!.main || null,
    }))
  if (texts.length) await tx.insert(lunchDayTranslations).values(texts)
}

/** Сохранить неделю целиком: дни, которых нет в списке или без блюд, — без меню */
export async function saveLunchWeek(input: LunchWeekInput, userId: number) {
  const dates = weekDates(input.monday)
  if (input.days.some((d) => !dates.includes(d.date))) {
    throw createError({ statusCode: 400, message: 'День не из этой недели (пн–пт)' })
  }
  await useDb().transaction(async (tx) => {
    for (const date of dates) {
      const day = input.days.find((d) => d.date === date)
      if (day) await writeDay(tx, day, userId)
      else await tx.delete(lunchDays).where(eq(lunchDays.date, date))
    }
  })
}

/**
 * Скопировать прошлую неделю в эту — только в дни, где меню ещё нет:
 * уже заполненное не трогаем. Возвращает, сколько дней скопировано.
 */
export async function copyPreviousLunchWeek(monday: string, userId: number) {
  return await useDb().transaction(async (tx) => {
    const prevMonday = addDays(monday, -7)
    const previous = await loadDays(tx, prevMonday, addDays(prevMonday, LUNCH_WEEKDAYS - 1))
    const current = await tx
      .select({ date: lunchDays.date })
      .from(lunchDays)
      .where(and(between(lunchDays.date, monday, addDays(monday, LUNCH_WEEKDAYS - 1))))
    const filled = new Set(current.map((r) => r.date))

    let copied = 0
    for (const day of previous) {
      const date = addDays(day.date, 7)
      if (filled.has(date)) continue
      await writeDay(tx, { ...day, date }, userId)
      copied++
    }
    return copied
  })
}
