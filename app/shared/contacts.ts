// Контакты и часы работы (5.2, экран admin/contacts.html прототипа).
// Хранятся в settings: hours — часы, правила брони и особые дни; contacts — адрес, связь, соцсети.
// Строку часов для подвала сайт собирает сам — hoursLine, сразу на трёх языках.
import { z } from 'zod'
import { contentLocales, type ContentLocale } from './locales'
import { isDateString } from './dates'
import type { Localized } from './menu'

export interface DayHours {
  open: boolean
  /** «ЧЧ:ММ» */
  from: string
  to: string
}

export interface SpecialDay {
  /** «2026-12-24» */
  date: string
  open: boolean
  from: string
  to: string
  /** Подпись на сайте: «Сочельник» */
  label: Localized<string>
}

export interface HoursSettings {
  /** Понедельник … воскресенье */
  week: DayHours[]
  /** Последняя бронь стола — за столько минут до закрытия (❓ 7.1) */
  lastBookingBeforeCloseMin: number
  /** Бронировать онлайн не позже чем за столько часов (❓ 7.1) */
  bookingLeadHours: number
  /** С этого числа гостей — уже банкет, а не стол (❓ 7.1) */
  banquetFromGuests: number
  /** Особые дни важнее обычного расписания */
  specialDays: SpecialDay[]
}

export interface ContactsSettings {
  address: Localized<string>
  phone: string
  whatsapp: string
  email: string
  mapUrl: string
  facebook: string
  tripadvisor: string
  foursquare: string
}

export interface AdminContacts {
  hours: HoursSettings
  contacts: ContactsSettings
}

const day = (from: string, to: string): DayHours => ({ open: true, from, to })

// Значения — из прототипа и с действующего сайта
export const defaultHours: HoursSettings = {
  week: [
    day('11:00', '18:00'),
    day('11:00', '18:00'),
    day('11:00', '18:00'),
    day('11:00', '18:00'),
    day('11:00', '19:00'),
    day('11:00', '19:00'),
    day('11:00', '19:00'),
  ],
  lastBookingBeforeCloseMin: 60,
  bookingLeadHours: 2,
  banquetFromGuests: 12,
  specialDays: [],
}

export const defaultContacts: ContactsSettings = {
  address: {
    et: 'Mere 10, Paldiski 76805',
    en: 'Mere 10, Paldiski 76805',
    ru: 'Mere 10, Палдиски 76805',
  },
  phone: '+372 53 423 425',
  whatsapp: '+372 53 423 425',
  email: 'info@peetritoll.ee',
  mapUrl: 'https://maps.google.com/?q=Mere+10+Paldiski',
  facebook: 'https://www.facebook.com/TavernPeetriToll',
  tripadvisor: '',
  foursquare: '',
}

// ---------- Строка часов для подвала ----------

const dayNames: Record<ContentLocale, string[]> = {
  ru: ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'],
  et: ['E', 'T', 'K', 'N', 'R', 'L', 'P'],
  en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
}
const words: Record<ContentLocale, { open: string; closed: string }> = {
  ru: { open: 'Открыто', closed: 'выходной' },
  et: { open: 'Avatud', closed: 'suletud' },
  en: { open: 'Open', closed: 'closed' },
}
// Эстонская и русская запись времени — с точкой, английская — с двоеточием
const time = (t: string, locale: ContentLocale) => (locale === 'en' ? t : t.replace(':', '.'))

/**
 * «Открыто: пн–чт 11.00–18.00, пт–вс 11.00–19.00» — соседние дни с одинаковыми часами
 * сливаются в диапазон, выходные пишутся словом.
 */
export function hoursLine(week: DayHours[], locale: ContentLocale): string {
  const same = (a: DayHours, b: DayHours) =>
    a.open === b.open && (!a.open || (a.from === b.from && a.to === b.to))
  const parts: string[] = []
  for (let i = 0; i < week.length;) {
    let j = i
    while (j + 1 < week.length && same(week[j + 1]!, week[i]!)) j++
    const names = dayNames[locale]
    const days = i === j ? names[i] : `${names[i]}–${names[j]}`
    const d = week[i]!
    parts.push(
      d.open
        ? `${days} ${time(d.from, locale)}–${time(d.to, locale)}`
        : `${days} ${words[locale].closed}`,
    )
    i = j + 1
  }
  return `${words[locale].open}: ${parts.join(', ')}`
}

// ---------- Проверка ----------

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Время в виде ЧЧ:ММ')
const optionalUrl = z.union([
  z.literal(''),
  z.url({ protocol: /^https?$/, error: 'Ссылка должна начинаться с http:// или https://' }),
])
const phone = z
  .string()
  .trim()
  .max(30)
  .regex(/^[+\d\s()-]*$/, 'Телефон — цифры, пробелы и «+»')

const dayHoursSchema = z
  .object({ open: z.boolean(), from: timeSchema, to: timeSchema })
  .refine((d) => !d.open || d.from < d.to, { message: 'Закрытие — позже открытия', path: ['to'] })

export const hoursSettingsSchema = z.object({
  week: z.array(dayHoursSchema).length(7),
  lastBookingBeforeCloseMin: z.number().int().min(0).max(600),
  bookingLeadHours: z
    .number()
    .int()
    .min(0)
    .max(24 * 30),
  banquetFromGuests: z.number().int().min(1).max(1000),
  specialDays: z
    .array(
      z
        .object({
          date: z.string().refine(isDateString, 'Неверная дата'),
          open: z.boolean(),
          from: timeSchema,
          to: timeSchema,
          label: z.partialRecord(z.enum(contentLocales), z.string().trim().max(100)),
        })
        .refine((d) => !d.open || d.from < d.to, {
          message: 'В особый день закрытие — позже открытия',
          path: ['to'],
        }),
    )
    .max(100)
    .refine((days) => new Set(days.map((d) => d.date)).size === days.length, {
      message: 'Одна и та же дата в особых днях дважды',
    }),
})

export const contactsSettingsSchema = z.object({
  address: z.partialRecord(z.enum(contentLocales), z.string().trim().max(200)),
  phone,
  whatsapp: phone,
  email: z.union([z.literal(''), z.email('Неверный e-mail')]),
  mapUrl: optionalUrl,
  facebook: optionalUrl,
  tripadvisor: optionalUrl,
  foursquare: optionalUrl,
})

export const adminContactsSchema = z.object({
  hours: hoursSettingsSchema,
  contacts: contactsSettingsSchema,
})
