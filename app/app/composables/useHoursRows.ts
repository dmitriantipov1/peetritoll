// Часы работы строками «Пн — чт» / «11:00 — 18:00»: соседние дни с одинаковыми часами — одной
// строкой, названия дней — на языке страницы. Для «Контактов» и «Ресторана».
import { groupWeek, type DayHours } from '#shared/contacts'

export function useHoursRows(week: () => DayHours[] | undefined) {
  const { t, locale } = useI18n()
  // 9 ноября 2026 — понедельник: от него берём названия дней недели на языке страницы
  const dayName = (i: number) =>
    new Intl.DateTimeFormat(locale.value, { weekday: 'short', timeZone: 'UTC' })
      .format(new Date(`2026-11-${String(9 + i).padStart(2, '0')}T00:00:00Z`))
      .replace('.', '')
  const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  return computed(() =>
    groupWeek(week() ?? []).map(({ first, last, hours }) => ({
      days: capital(first === last ? dayName(first) : `${dayName(first)} — ${dayName(last)}`),
      text: hours.open ? `${hours.from} — ${hours.to}` : t('contacts.closed'),
    })),
  )
}
