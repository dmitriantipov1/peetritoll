// Заявки (7.1, 7.2, 8.1): виды, статусы, что приходит из формы и что хранится.
// Общий файл: одна проверка для форм сайта (шаг 2), админки и сервера.
import { z } from 'zod'
import type { Section } from './access'
import { contentLocales } from './locales'
import { isDateString } from './dates'
import type { Localized } from './menu'

// ---------- Виды и статусы ----------

export const requestTypes = ['table', 'banquet', 'group', 'lunch', 'tour', 'event'] as const
export type RequestType = (typeof requestTypes)[number]

export const requestTypeNames: Record<RequestType, string> = {
  table: 'Бронь стола',
  banquet: 'Банкет',
  group: 'Группа',
  lunch: 'Обед',
  tour: 'Экскурсия',
  event: 'Мероприятие',
}

/**
 * Раздел прав, который открывает заявки вида (shared/access.ts).
 * Группа — вместе с банкетами: оба — ресторанные заказы по каталогу (решение 10.11.2026).
 */
export const requestSection: Record<RequestType, Section> = {
  table: 'requests.table',
  banquet: 'requests.banquet',
  group: 'requests.banquet',
  lunch: 'requests.lunch',
  tour: 'requests.tours',
  event: 'requests.events',
}

/** Статусы (7.1): новая → в работе → согласована или отменена */
export const requestStatuses = ['new', 'in_progress', 'confirmed', 'cancelled'] as const
export type RequestStatus = (typeof requestStatuses)[number]

export const requestStatusNames: Record<RequestStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  confirmed: 'Согласована',
  cancelled: 'Отменена',
}

export type RequestSource = 'site' | 'admin'

/** Версия политики конфиденциальности, с которой гость согласился (8.1). Новый текст — новый номер */
export const PRIVACY_POLICY_VERSION = '1'

// ---------- Справочники полей ----------

/** Повод брони стола — как в форме на странице «Ресторан» */
export const tableOccasions = ['dinner', 'birthday', 'family', 'business', 'other'] as const
export const tableOccasionNames: Record<(typeof tableOccasions)[number], string> = {
  dinner: 'Просто поужинать',
  birthday: 'День рождения',
  family: 'Семейный обед',
  business: 'Деловая встреча',
  other: 'Другое',
}

/** Повод банкета (7.1) */
export const banquetOccasions = ['birthday', 'wedding', 'corporate', 'memorial', 'other'] as const
export const banquetOccasionNames: Record<(typeof banquetOccasions)[number], string> = {
  birthday: 'День рождения или юбилей',
  wedding: 'Свадьба',
  corporate: 'Корпоратив',
  memorial: 'Поминки',
  other: 'Другое',
}

/** «Что вас интересует» в форме «Экскурсии и поездки» */
export const tourTopics = [
  'exhibition',
  'secrets',
  'guide',
  'radioguides',
  'pakri',
  'other',
] as const
export type TourTopic = (typeof tourTopics)[number]
export const tourTopicNames: Record<TourTopic, string> = {
  exhibition: 'Экскурсия по выставке',
  secrets: '«Тайны старой таможни»',
  guide: 'Тур с местным гидом',
  radioguides: 'Радиогиды в аренду',
  pakri: 'Pakri Express',
  other: 'Другое',
}

/** Обед: на месте или с собой */
export const lunchModes = ['onsite', 'pickup'] as const
export const lunchModeNames: Record<(typeof lunchModes)[number], string> = {
  onsite: 'На месте',
  pickup: 'Самовывоз',
}

/** Что заказывают в меню дня: суп и горячее. «Обеда целиком» нет (12.11.2026) */
export const lunchItems = ['soup', 'main'] as const
/** В старых заявках в расчёте может быть 'full' — «Обед дня»: строки расчёта хранятся снимком */
export type LunchItem = (typeof lunchItems)[number] | 'full'

// ---------- Что хранится ----------

/** Своё у каждого вида заявки (колонка details) */
export type RequestDetails =
  | { type: 'table'; occasion: (typeof tableOccasions)[number] | null }
  | {
      type: 'banquet'
      occasion: (typeof banquetOccasions)[number] | null
      /** С какого сета начали в калькуляторе, если с него */
      setTier: 'basic' | 'middle' | 'premium' | null
    }
  | {
      type: 'group'
      agency: string | null
      /** Выбранный обед «Трапез групп»; null — ещё не выбрали, обсудят по телефону.
       *  В заявках до 12.11.2026 поля нет: там расчёт по блюдам каталога */
      menuId?: number | null
    }
  | { type: 'lunch'; mode: (typeof lunchModes)[number] }
  | { type: 'tour'; topic: TourTopic }
  | {
      type: 'event'
      materialId: number
      /** Название мероприятия снимком: материал могут переименовать или удалить */
      title: Localized<string>
    }

/** Строка расчёта — снимок на момент отправки, а не ссылка на каталог (7.1) */
export interface RequestCalcLine {
  /** Блюдо каталога (банкет; группа — до 12.11.2026), позиция меню дня или обед для групп
   *  (цена с человека × число людей) */
  ref:
    | { kind: 'catalog'; dishId: number }
    | { kind: 'lunch'; item: LunchItem }
    | { kind: 'groupMenu'; menuId: number }
  names: Localized<string>
  /** Категория каталога — для группировки в карточке и Excel; у обеда для групп — «Меню № 3» */
  category: Localized<string> | null
  priceCents: number
  qty: number
}

export interface RequestCalc {
  lines: RequestCalcLine[]
  /** Ориентировочно — не «итого» и не оферта (7.1) */
  totalCents: number
  /** Когда снят снимок цен */
  pricedAt: string
}

/** Как заявка пришла — для «в заявке было …» */
export interface RequestOriginal {
  visitDate: string | null
  visitTime: string | null
  guests: number | null
}

export type RequestHistoryKind = 'created' | 'status' | 'changed' | 'notified'

/** Одно изменение в истории: поле, было, стало */
export interface RequestChange {
  field: string
  from: string | number | null
  to: string | number | null
}

// ---------- Что приходит из формы ----------

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Время — ЧЧ:ММ')
const visitDate = z.string().refine(isDateString, 'Укажите дату')
const guests = z
  .number({ error: 'Укажите число гостей' })
  .int()
  .min(1, 'Хотя бы один гость')
  .max(500, 'Слишком много гостей')
const qty = z.number().int().min(0).max(1000)

// E-mail необязателен: пустая строка из формы — то же, что «нет»
const email = z
  .string()
  .trim()
  .toLowerCase()
  .max(200)
  .pipe(z.union([z.literal(''), z.email('Проверьте e-mail')]))
  .transform((v) => v || null)

const common = {
  locale: z.enum(contentLocales),
  name: z.string().trim().min(1, 'Укажите имя').max(100, 'Имя слишком длинное'),
  // Телефон есть во всех формах сайта: по нему подтверждаем заявку
  phone: z
    .string()
    .trim()
    .min(5, 'Укажите телефон')
    .max(40, 'Телефон слишком длинный')
    .regex(/^[+\d\s()-]+$/, 'В телефоне — только цифры, пробелы, +, -, скобки'),
  email: email.nullable().default(null),
  comment: z
    .string()
    .trim()
    .max(2000, 'Комментарий слишком длинный')
    .transform((v) => v || null)
    .nullable()
    .default(null),
  marketingOptIn: z.boolean().default(false),
}

const catalogItems = z
  .array(z.object({ dishId: z.number().int().positive(), qty: qty.min(1) }))
  .max(200)

export const requestInputSchema = z.discriminatedUnion(
  'type',
  [
    z.object({
      ...common,
      type: z.literal('table'),
      visitDate,
      visitTime: time,
      guests,
      occasion: z.enum(tableOccasions).nullable().default(null),
    }),
    z.object({
      ...common,
      type: z.literal('banquet'),
      visitDate,
      visitTime: time,
      guests,
      occasion: z.enum(banquetOccasions).nullable().default(null),
      setTier: z.enum(['basic', 'middle', 'premium']).nullable().default(null),
      // Пустой расчёт допустим: заявка — не заказ, отправку не блокируем (7.1)
      items: catalogItems,
    }),
    z.object({
      ...common,
      type: z.literal('group'),
      visitDate,
      visitTime: time,
      guests,
      agency: z
        .string()
        .trim()
        .max(200)
        .transform((v) => v || null)
        .nullable()
        .default(null),
      // Обед «Трапез групп»; не выбрали — обсудим по телефону, заявку всё равно принимаем
      menuId: z.number().int().positive().nullable().default(null),
    }),
    z.object({
      ...common,
      type: z.literal('lunch'),
      visitDate,
      visitTime: time,
      mode: z.enum(lunchModes).default('onsite'),
      items: z
        .object({ soup: qty, main: qty })
        .refine((i) => i.soup + i.main > 0, 'Выберите хотя бы одну позицию'),
    }),
    z.object({
      ...common,
      type: z.literal('tour'),
      visitDate,
      guests,
      topic: z.enum(tourTopics, 'Выберите, что вас интересует'),
    }),
    z.object({
      ...common,
      type: z.literal('event'),
      guests,
      materialId: z.number().int().positive(),
    }),
  ],
  { error: 'Неизвестный вид заявки' },
)

export type RequestInput = z.infer<typeof requestInputSchema>

/** Правка заявки персоналом: визит, гость, заметка. Расчёт правится отдельно (слой карточки) */
export const requestPatchSchema = z
  .object({
    visitDate: visitDate.nullable(),
    visitTime: time.nullable(),
    guests: guests.nullable(),
    name: common.name,
    phone: common.phone,
    email: email.nullable(),
    staffNote: z
      .string()
      .trim()
      .max(4000)
      .transform((v) => v || null)
      .nullable(),
  })
  .partial()

export type RequestPatch = z.infer<typeof requestPatchSchema>

/** Подписи полей для истории («Время 18:30 → 18:00») */
export const requestFieldNames: Record<string, string> = {
  status: 'Статус',
  visitDate: 'Дата',
  visitTime: 'Время',
  guests: 'Гостей',
  name: 'Имя',
  phone: 'Телефон',
  email: 'E-mail',
  staffNote: 'Заметка',
}

/** Сохранение карточки: правка полей, статус и пояснение одним действием */
export const requestSaveSchema = requestPatchSchema.extend({
  status: z.enum(requestStatuses).optional(),
  // «по звонку гостя» — пойдёт в историю рядом с изменением
  note: z
    .string()
    .trim()
    .max(300)
    .transform((v) => v || null)
    .nullable()
    .optional(),
})

export type RequestSave = z.infer<typeof requestSaveSchema>

// ---------- Что видит админка ----------

/** Строка списка заявок */
export interface AdminRequestRow {
  id: number
  type: RequestType
  status: RequestStatus
  source: RequestSource
  createdAt: string
  visitDate: string | null
  visitTime: string | null
  guests: number | null
  name: string
  phone: string
  email: string | null
  /** Тема экскурсии — для вкладок «Экскурсии / Pakri Express / Радиогиды» */
  topic: TourTopic | null
  /** «День рождения · 8 блюд · ≈ 956 €», «Обед дня × 2 · самовывоз», «Если можно, у камина» */
  summary: string
  totalCents: number | null
}

/** Строка расчёта в карточке: плюс цена в каталоге сейчас (null — блюда уже нет) */
export interface AdminRequestCalcLine extends RequestCalcLine {
  nowCents: number | null
}

export interface AdminRequestHistoryItem {
  id: number
  kind: RequestHistoryKind
  changes: RequestChange[]
  note: string | null
  at: string
  userName: string | null
}

/** Карточка заявки */
export interface AdminRequest extends AdminRequestRow {
  locale: 'et' | 'en' | 'ru'
  comment: string | null
  staffNote: string | null
  details: RequestDetails
  calc: (Omit<RequestCalc, 'lines'> & { lines: AdminRequestCalcLine[] }) | null
  original: RequestOriginal
  consentAt: string | null
  policyVersion: string | null
  marketingOptIn: boolean
  createdByName: string | null
  /** Контакт в лидах: имя, сколько обращений, с какого времени, автотеги */
  lead: { id: number; name: string; events: number; since: string; tags: string[] } | null
  updatedAt: string
  /** Сначала новые */
  history: AdminRequestHistoryItem[]
}

/** Текст для админки: русский, иначе эстонский, иначе любой */
export function ruFirst(names: Localized<string> | null | undefined): string {
  if (!names) return ''
  return names.ru ?? names.et ?? Object.values(names)[0] ?? ''
}

/** Вкладки списка: виды, а экскурсии — ещё по теме */
export const requestTabs = [
  { key: 'table', label: 'Бронь стола', type: 'table' },
  { key: 'banquet', label: 'Банкет', type: 'banquet' },
  { key: 'group', label: 'Группа', type: 'group' },
  { key: 'lunch', label: 'Обеды', type: 'lunch' },
  {
    key: 'tour',
    label: 'Экскурсии',
    type: 'tour',
    topics: ['exhibition', 'secrets', 'guide', 'other'],
  },
  { key: 'pakri', label: 'Pakri Express', type: 'tour', topics: ['pakri'] },
  { key: 'radioguides', label: 'Радиогиды', type: 'tour', topics: ['radioguides'] },
  { key: 'event', label: 'Мероприятия', type: 'event' },
] as const satisfies readonly {
  key: string
  label: string
  type: RequestType
  topics?: readonly TourTopic[]
}[]

export type RequestTabKey = (typeof requestTabs)[number]['key']

export function inTab(row: Pick<AdminRequestRow, 'type' | 'topic'>, key: RequestTabKey): boolean {
  const tab = requestTabs.find((t) => t.key === key)!
  if (tab.type !== row.type) return false
  return !('topics' in tab) || (tab.topics as readonly string[]).includes(row.topic ?? '')
}
