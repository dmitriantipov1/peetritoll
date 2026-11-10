// Лиды (8.2): что видит админка и что принимает. Общий файл для сервера и экранов.
import { z } from 'zod'
import { contentLocales, type ContentLocale } from './locales'
import type { RequestStatus, RequestType, TourTopic } from './requests'

/** Согласие на рассылку: не давал · ждём подтверждения по письму · согласен */
export type LeadMarketing = 'no' | 'pending' | 'yes'

export const leadMarketingNames: Record<LeadMarketing, string> = {
  no: 'Нет',
  pending: 'Ждёт подтверждения',
  yes: 'Да',
}

/** Категории (8.2): клиенты ресторана отдельно от посетителей мероприятий. Покупатели и подписчики — с магазином */
export const leadCategories = ['restaurant', 'events', 'tours'] as const
export type LeadCategory = (typeof leadCategories)[number]

export const leadCategoryNames: Record<LeadCategory, string> = {
  restaurant: 'Ресторан',
  events: 'Мероприятия',
  tours: 'Экскурсии',
}

export const requestCategory: Record<RequestType, LeadCategory> = {
  table: 'restaurant',
  banquet: 'restaurant',
  group: 'restaurant',
  lunch: 'restaurant',
  tour: 'tours',
  event: 'events',
}

/** Автотег по виду заявки. Названия уедут в Mautic как есть (8.2) — менять осторожно */
export function autoTagFor(
  type: RequestType,
  extra: { topic?: TourTopic; eventTitle?: string },
): string {
  switch (type) {
    case 'table':
      return 'бронь стола'
    case 'banquet':
      return 'запрос: банкет'
    case 'group':
      return 'запрос: группа'
    case 'lunch':
      return 'предзаказ обеда'
    case 'tour':
      if (extra.topic === 'pakri') return 'Pakri Express'
      if (extra.topic === 'radioguides') return 'радиогиды'
      return 'экскурсия'
    case 'event':
      return extra.eventTitle ? `мероприятие: ${extra.eventTitle}` : 'мероприятие'
  }
}

/** Телефон для склейки: только цифры. «+372 5390-4478» → «37253904478» */
export function phoneKey(phone: string | null | undefined): string | null {
  const digits = (phone ?? '').replace(/\D/g, '')
  return digits.length >= 5 ? digits : null
}

export interface LeadTag {
  tag: string
  auto: boolean
}

/** Строка списка лидов */
export interface AdminLeadRow {
  id: number
  name: string
  email: string | null
  phone: string | null
  locale: ContentLocale
  marketing: LeadMarketing
  marketingAt: string | null
  tags: LeadTag[]
  categories: LeadCategory[]
  events: number
  lastEventAt: string
  createdAt: string
  /** Есть другой контакт с тем же телефоном */
  possibleDupe: boolean
}

/** Событие контакта — пока это заявки */
export interface AdminLeadEvent {
  requestId: number
  type: RequestType
  status: RequestStatus
  createdAt: string
  visitDate: string | null
  visitTime: string | null
  guests: number | null
  summary: string
  comment: string | null
}

export interface AdminLeadDupe {
  id: number
  name: string
  email: string | null
  phone: string | null
  events: number
}

/** Карточка лида */
export interface AdminLead extends AdminLeadRow {
  marketingSource: string | null
  history: AdminLeadEvent[]
  /** Последнее согласие на обработку: когда, в какой заявке, версия политики */
  consent: { at: string; requestId: number; policyVersion: string } | null
  dupes: AdminLeadDupe[]
}

/** Все теги с числом контактов — для подсказки при вводе и фильтра */
export interface LeadTagCount {
  tag: string
  auto: boolean
  count: number
}

const tagSchema = z.string().trim().min(1).max(60, 'Тег слишком длинный')

export const leadInputSchema = z.object({
  name: z.string().trim().min(1, 'Укажите имя').max(100, 'Имя слишком длинное'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(200)
    .pipe(z.union([z.literal(''), z.email('Проверьте e-mail')]))
    .transform((v) => v || null)
    .nullable(),
  phone: z
    .string()
    .trim()
    .max(40, 'Телефон слишком длинный')
    .transform((v) => v || null)
    .nullable(),
  locale: z.enum(contentLocales),
  /** Свои теги целиком. Автотеги сюда не входят и не меняются */
  tags: z.array(tagSchema).max(50),
  /** Отписать от рассылки. Включить её может только сам гость (8.2) */
  marketingOff: z.boolean().optional(),
})

export type LeadInput = z.infer<typeof leadInputSchema>
