// Бронь стола с сайта (7.1): какие дни и время предлагать. Одни и те же правила для формы
// на странице «Ресторан» и для проверки на сервере. Значения — из «Контактов и часов»
// (settings.hours): часы по дням, особые дни, последняя бронь до закрытия, за сколько часов
// бронировать онлайн, с какого числа гостей — банкет (❓ 7.1: значения по умолчанию ждут заказчицу).
import type { DayHours, HoursSettings } from './contacts'
import { fromTallinnLocal, weekday } from './dates'

/** Что нужно правилам: часы по дням и особые дни (с сайта — без подписей) */
export interface BookingHours {
  week: DayHours[]
  specialDays: { date: string; open: boolean; from: string; to: string }[]
}

export type BookingRules = BookingHours &
  Pick<HoursSettings, 'lastBookingBeforeCloseMin' | 'bookingLeadHours' | 'banquetFromGuests'>

/** Шаг времени брони, минут */
export const BOOKING_STEP = 30

/** Часы в этот день: особый день важнее обычного расписания */
export function hoursOn(date: string, hours: BookingHours): DayHours {
  const special = hours.specialDays.find((d) => d.date === date)
  if (special) return { open: special.open, from: special.from, to: special.to }
  return hours.week[weekday(date) - 1]!
}

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
const toTime = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

/**
 * Время брони в этот день: каждые полчаса от открытия и не позже чем за
 * lastBookingBeforeCloseMin до закрытия; и не раньше чем через bookingLeadHours от «сейчас».
 * Закрыто или всё уже прошло — пусто: форма предложит позвонить.
 */
export function bookingTimes(date: string, hours: BookingRules, now = new Date()): string[] {
  const day = hoursOn(date, hours)
  if (!day.open) return []
  const last = toMin(day.to) - hours.lastBookingBeforeCloseMin
  const earliest = now.getTime() + hours.bookingLeadHours * 3600 * 1000
  const times: string[] = []
  for (let m = toMin(day.from); m <= last; m += BOOKING_STEP) {
    const t = toTime(m)
    if (fromTallinnLocal(`${date}T${t}`).getTime() >= earliest) times.push(t)
  }
  return times
}

/** С этого числа гостей — уже банкет, а не стол */
export function isBanquetSize(guests: number, hours: Pick<BookingRules, 'banquetFromGuests'>) {
  return guests >= hours.banquetFromGuests
}
