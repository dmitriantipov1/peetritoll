// Контакты и часы для сайта: страница «Контакты» (contacts.html прототипа) и подвал.
// Тексты уже на языке страницы. Источник — экран «Контакты и часы» в админке.
import type { DayHours } from './contacts'

export interface SiteSpecialDay {
  /** «2026-12-24» */
  date: string
  open: boolean
  from: string
  to: string
  /** «Сочельник» на языке страницы, иначе эстонский; может быть пустым */
  label: string
}

export interface SiteContacts {
  address: string
  phone: string
  whatsapp: string
  email: string
  mapUrl: string
  facebook: string
  tripadvisor: string
  foursquare: string
  /** «Открыто: пн–чт 11.00–18.00, пт–вс 11.00–19.00» — для подвала */
  hoursLine: string
  /** Понедельник … воскресенье */
  week: DayHours[]
  /** Особые дни с сегодняшнего (по Таллину), по порядку дат */
  specialDays: SiteSpecialDay[]
}

/** «+372 53 423 425» → «+37253423425» для tel: и wa.me */
export const phoneDigits = (phone: string) => phone.replace(/[^\d+]/g, '')
