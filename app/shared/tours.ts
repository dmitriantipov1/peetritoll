// Экскурсионные программы — «Наши экскурсионные программы» на странице «Экскурсии и поездки»
// (20.11.2026): карточки ведутся в админке, потому что цены, гиды и языки меняются.
// У программы на каждом языке — название, описание, длительность и условия; общее — цена
// (за группу или с человека), минимум человек, гид, языки, фото. Одна схема zod на сервер и форму.
import { z } from 'zod'
import { contentLocales } from './locales'
import type { Localized } from './menu'
import type { MediaImage } from './media'

/** Языки, на которых гид ведёт программу; названия — в переводах (services.guides.languages) */
export const tourLanguages = ['et', 'ru', 'en', 'fi', 'de'] as const
export type TourLanguage = (typeof tourLanguages)[number]
export const tourLanguageNames: Record<TourLanguage, string> = {
  et: 'Эстонский',
  ru: 'Русский',
  en: 'Английский',
  fi: 'Финский',
  de: 'Немецкий',
}

/** Цена за группу целиком или с человека */
export const tourPriceUnits = ['group', 'person'] as const
export type TourPriceUnit = (typeof tourPriceUnits)[number]
export const tourPriceUnitNames: Record<TourPriceUnit, string> = {
  group: 'за группу',
  person: 'с человека',
}

export interface AdminTour {
  id: number
  isVisible: boolean
  priceCents: number
  priceUnit: TourPriceUnit
  /** «Группа от 12 человек»; null — без ограничения */
  minPeople: number | null
  /** Имя гида как на сайте; пусто — строки «Гид» нет */
  guide: string
  languages: TourLanguage[]
  photo: MediaImage | null
  /** Картинка из public/images — у программ, заведённых до загрузки фото */
  legacyPhoto: string | null
  titles: Localized<string>
  texts: Localized<string>
  /** «20 минут», «1,5–2 часа» */
  durations: Localized<string>
  /** «по предварительному заказу · для групп и индивидуальных гостей» */
  terms: Localized<string>
}

/** Программа для формы заявки и снимка в ней: название на всех языках, что есть */
export interface TourRef {
  id: number
  titles: Localized<string>
}

/** «Экспресс-экскурсия по выставке» — по-русски, иначе на любом языке, что есть (админка) */
export function tourTitleRu(titles: Localized<string>): string {
  return titles.ru || titles.et || titles.en || ''
}

// ---------- Проверка ----------

const texts = (max: number) => z.partialRecord(z.enum(contentLocales), z.string().trim().max(max))

export const tourInputSchema = z
  .object({
    isVisible: z.boolean(),
    priceCents: z.number().int().min(0).max(1_000_000),
    priceUnit: z.enum(tourPriceUnits),
    minPeople: z.number().int().min(1, 'Минимум — от 1 человека').max(1000).nullable(),
    guide: z.string().trim().max(100),
    languages: z.array(z.enum(tourLanguages)).max(tourLanguages.length),
    photoId: z.uuid().nullable(),
    // Старую картинку из public/images можно только оставить или убрать; новое фото — загрузкой
    legacyPhoto: z.string().regex(/^\/images\/[\w.-]+$/).nullable(),
    titles: texts(150),
    texts: texts(2000),
    durations: texts(60),
    terms: texts(200),
  })
  .refine((t) => Object.values(t.titles).some(Boolean), {
    message: 'Нужно название хотя бы на одном языке',
    path: ['titles'],
  })
export type TourInput = z.infer<typeof tourInputSchema>

// ---------- Сайт ----------

/** Программа на странице «Экскурсии и поездки»: тексты уже на языке страницы (иначе эстонский) */
export interface SiteTour {
  id: number
  title: string
  text: string
  duration: string
  terms: string
  priceCents: number
  priceUnit: TourPriceUnit
  minPeople: number | null
  guide: string
  languages: TourLanguage[]
  photo: MediaImage | null
  legacyPhoto: string | null
}
