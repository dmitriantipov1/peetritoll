// Настройки сайта (5.2, экран admin/settings.html прототипа): разделы и языки, уведомления,
// мероприятия и афиши. Хранятся в settings: sections, notifications, events.
import { z } from 'zod'
import { contentLocales, type ContentLocale } from './locales'
import type { MediaImage } from './media'

/** Раздел сайта: показан ли и на каких языках */
export interface SectionState {
  enabled: boolean
  locales: Record<ContentLocale, boolean>
}

export const siteSections = [
  { key: 'restaurant', title: 'Ресторан', path: '/', note: 'Меню, история, отзывы' },
  {
    key: 'menu',
    title: 'Основное меню',
    path: '/menu',
    note: 'Меню ресторана',
    parent: 'restaurant',
  },
  {
    key: 'lunch',
    title: 'Дневное меню и предзаказ обедов',
    path: '/lunch',
    note: 'Кнопка в «Меню»; тот же переключатель — в «Дневном меню»',
    parent: 'restaurant',
  },
  {
    key: 'booking',
    title: 'Бронь стола',
    path: 'форма',
    note: 'Заявки — в «Заявки»',
    parent: 'restaurant',
  },
  {
    key: 'banquet',
    title: 'Запрос на банкет',
    path: 'форма',
    note: 'С калькулятором',
    parent: 'restaurant',
  },
  {
    key: 'group',
    title: 'Групповое меню',
    path: 'страница',
    note: 'Трапезы групп и запрос',
    parent: 'restaurant',
  },
  { key: 'museum', title: 'Музей', path: '/museum', note: 'Выставка, архивы, книги, авторы' },
  {
    key: 'services',
    title: 'Экскурсии и поездки',
    path: '/services',
    note: 'Экскурсии, аудиогид, радиогиды',
  },
  {
    key: 'pakri',
    title: 'Pakri Express',
    path: '/services',
    note: 'Поездки на поезде',
    parent: 'services',
  },
  { key: 'events', title: 'Мероприятия', path: '/events', note: 'Предстоящие и архив' },
  {
    key: 'news',
    title: 'Новости',
    path: '/news',
    note: 'Выключите — блок новостей пропадёт со всех страниц',
  },
  { key: 'gallery', title: 'Галерея', path: '/about', note: 'Фото по категориям' },
  {
    key: 'shop',
    title: 'Магазин',
    path: '/shop',
    note: 'Пока кнопки «Купить» ведут в магазин SumUp',
  },
] as const

export type SectionKey = (typeof siteSections)[number]['key']
export const sectionKeys = siteSections.map((s) => s.key) as SectionKey[]

const allLocales = () =>
  Object.fromEntries(contentLocales.map((l) => [l, true])) as Record<ContentLocale, boolean>

// Как в прототипе: Pakri Express ждёт условий, магазин — своего этапа
export const defaultSections = Object.fromEntries(
  sectionKeys.map((key) => [
    key,
    { enabled: key !== 'pakri' && key !== 'shop', locales: allLocales() },
  ]),
) as Record<SectionKey, SectionState>

export interface NotificationSettings {
  /** Куда приходят заявки и заказы */
  email: string
}

export const defaultNotifications: NotificationSettings = { email: 'info@peetritoll.ee' }

export interface EventsSettings {
  /** Смена мероприятия и афиши в блоке «Мероприятия», секунд */
  rotateSeconds: number
  /** Афиша для мероприятий без своей — картинка из media */
  defaultPosterId: string | null
}

export const defaultEvents: EventsSettings = { rotateSeconds: 10, defaultPosterId: null }

export interface AdminSiteSettings {
  sections: Record<SectionKey, SectionState>
  notifications: NotificationSettings
  events: EventsSettings & { defaultPoster: MediaImage | null }
}

// ---------- Проверка ----------

const sectionStateSchema = z.object({
  enabled: z.boolean(),
  locales: z.object({ et: z.boolean(), en: z.boolean(), ru: z.boolean() }),
})

export const sectionsSchema = z.object(
  Object.fromEntries(sectionKeys.map((k) => [k, sectionStateSchema])) as Record<
    SectionKey,
    typeof sectionStateSchema
  >,
)

export const notificationsSchema = z.object({
  email: z.union([z.literal(''), z.email('Неверный e-mail')]),
})

export const eventsSchema = z.object({
  rotateSeconds: z.number().int().min(3, 'Не чаще чем раз в 3 секунды').max(60),
  defaultPosterId: z.uuid().nullable(),
})

export const siteSettingsInputSchema = z.object({
  sections: sectionsSchema,
  notifications: notificationsSchema,
  events: eventsSchema,
})
export type SiteSettingsInput = z.infer<typeof siteSettingsInputSchema>
