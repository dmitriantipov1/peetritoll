// Даты без времени — строкой «2026-11-09». «Сегодня» считаем по Таллину, а не по серверу:
// сервер может стоять в другом часовом поясе, а меню дня живёт по эстонскому времени.
export const TIMEZONE = 'Europe/Tallinn'

/** Сегодняшняя дата в Таллине */
export function todayInTallinn(now = new Date()): string {
  // en-CA даёт формат ГГГГ-ММ-ДД
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIMEZONE }).format(now)
}

/** Текущее время в Таллине «ЧЧ:ММ» — для сроков предзаказа */
export function timeInTallinn(now = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(now)
}

export function isDateString(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value))
}

/** Сдвиг даты на n дней */
export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** День недели: 1 — понедельник … 7 — воскресенье */
export function weekday(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay() || 7
}

/** Понедельник недели, в которую попадает дата */
export function mondayOf(date: string): string {
  return addDays(date, 1 - weekday(date))
}

/** «09.11» — для подписей */
export function shortDate(date: string): string {
  return `${date.slice(8, 10)}.${date.slice(5, 7)}`
}
