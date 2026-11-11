// Основное меню в админке: что отдаёт сервер и что принимает при сохранении блюда.
// Схема проверки (zod) одна на сервер и форму — правила не разъезжаются.
import { z } from 'zod'
import { contentLocales, type ContentLocale } from './locales'
import type { MediaImage } from './media'

export type Localized<T> = Partial<Record<ContentLocale, T>>

/** Отметка из справочника: «Без лактозы» (для гостей) или «Новинка» (служебная) */
export interface AdminMark {
  id: number
  key: string
  names: Localized<string>
  /** Кнопка в фильтре меню: у отметок для гостей — всегда, у служебных — если включили */
  inFilter: boolean
  /** Кнопка в фильтре временно скрыта; значок на блюде остаётся */
  filterHidden: boolean
}

// Два справочника отметок (7.1): для гостей — кнопки-ограничения в фильтре меню,
// служебные — значок, по желанию кнопка-подборка в фильтре
export const markKinds = ['diet', 'labels'] as const
export type MarkKind = (typeof markKinds)[number]

export interface AdminPortion {
  id: number
  priceCents: number
  labels: Localized<string>
}

export interface AdminDish {
  id: number
  categoryId: number
  sort: number
  /** Загруженное фото */
  photo: MediaImage | null
  /** Старое: ссылка на фото со старого сайта, пока его не перенесли в загруженные */
  legacyPhoto: string | null
  isVisible: boolean
  translations: Localized<{ name: string; description: string | null }>
  portions: AdminPortion[]
  dietTagIds: number[]
  labelIds: number[]
}

export interface AdminDishDetails extends AdminDish {
  updatedAt: string
  updatedByName: string | null
}

export interface AdminMenuCategory {
  id: number
  slug: string
  sort: number
  isVisible: boolean
  /** На отдельной странице, а в основном меню — кнопка на неё (алкогольные напитки) */
  ownPage: boolean
  names: Localized<string>
  dishes: AdminDish[]
}

export interface AdminMenu {
  categories: AdminMenuCategory[]
  dietTags: AdminMark[]
  labels: AdminMark[]
}

// ---------- Сохранение блюда ----------

const text = (max: number) => z.string().trim().max(max)

const translation = z.object({
  name: text(200),
  description: text(1000).nullable(),
})

export const dishInputSchema = z
  .object({
    categoryId: z.number().int().positive(),
    photoId: z.uuid().nullable(),
    // Старую ссылку можно только оставить или убрать; новое фото — загрузкой (photoId)
    legacyPhoto: z.url({ protocol: /^https?$/ }).nullable(),
    isVisible: z.boolean(),
    // Перевод на язык — название и описание; язык без названия не сохраняем
    translations: z.partialRecord(z.enum(contentLocales), translation),
    portions: z
      .array(
        z.object({
          priceCents: z.number().int().min(0).max(1_000_000),
          labels: z.partialRecord(z.enum(contentLocales), text(100)),
        }),
      )
      .min(1, 'Нужна хотя бы одна цена')
      .max(10),
    dietTagIds: z.array(z.number().int().positive()).max(50),
    labelIds: z.array(z.number().int().positive()).max(50),
  })
  .refine((dish) => Object.values(dish.translations).some((t) => t?.name), {
    message: 'Нужно название хотя бы на одном языке',
    path: ['translations'],
  })
  .refine(
    (dish) =>
      dish.portions.length < 2 || dish.portions.every((p) => Object.values(p.labels).some(Boolean)),
    {
      message: 'Если цен несколько, у каждой нужна подпись — например, «Маленькая порция»',
      path: ['portions'],
    },
  )

export type DishInput = z.infer<typeof dishInputSchema>

// ---------- Категории и отметки ----------

/** Название на трёх языках; хотя бы одно должно быть */
const namesSchema = z
  .partialRecord(z.enum(contentLocales), text(100))
  .refine((names) => Object.values(names).some(Boolean), 'Нужно название хотя бы на одном языке')

export const categoryInputSchema = z.object({
  names: namesSchema,
  isVisible: z.boolean(),
  ownPage: z.boolean().default(false),
})
export type CategoryInput = z.infer<typeof categoryInputSchema>

/** inFilter учитывается только у служебных отметок: отметки для гостей в фильтре всегда */
export const markInputSchema = z.object({
  names: namesSchema,
  inFilter: z.boolean().default(false),
  filterHidden: z.boolean().default(false),
})
export type MarkInput = z.infer<typeof markInputSchema>

// ---------- Порядок ----------

/** Новый порядок: все номера списка, без повторов, в нужной последовательности */
export const orderInputSchema = z.object({
  ids: z
    .array(z.number().int().positive())
    .min(1)
    .max(500)
    .refine((ids) => new Set(ids).size === ids.length, 'Номера в списке повторяются'),
})
export type OrderInput = z.infer<typeof orderInputSchema>
