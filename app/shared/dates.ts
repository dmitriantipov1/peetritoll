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

/** «09.11.2026» */
export function fullDate(date: string): string {
  return `${date.slice(8, 10)}.${date.slice(5, 7)}.${date.slice(0, 4)}`
}

/** Момент времени → «2026-11-03T09:00» по Таллину — для поля <input type="datetime-local"> */
export function toTallinnLocal(moment: Date): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(moment)
      .map((p) => [p.type, p.value]),
  )
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

/** Когда было, по Таллину: «сегодня, 09:12», «вчера, 16:05», «29.10, 10:31», «02.09.2025, 10:31» */
export function momentLabel(moment: Date, now = new Date()): string {
  const local = toTallinnLocal(moment)
  const date = local.slice(0, 10)
  const time = local.slice(11)
  const today = todayInTallinn(now)
  if (date === today) return `сегодня, ${time}`
  if (date === addDays(today, -1)) return `вчера, ${time}`
  return `${date.slice(0, 4) === today.slice(0, 4) ? shortDate(date) : fullDate(date)}, ${time}`
}

export function isLocalDateTime(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/.test(value) &&
    isDateString(value.slice(0, 10))
  )
}

/**
 * «2026-11-03T09:00» по Таллину → момент времени. Смещение пояса берём на эту дату:
 * летом +3, зимой +2. Час, которого нет при переводе часов, сдвинется на час — для даты
 * публикации это не важно.
 */
export function fromTallinnLocal(local: string): Date {
  const asUtc = new Date(`${local}:00Z`)
  const shown = new Date(`${toTallinnLocal(asUtc)}:00Z`)
  return new Date(asUtc.getTime() - (shown.getTime() - asUtc.getTime()))
}
