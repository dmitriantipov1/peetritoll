// Основное меню в админке: что отдаёт сервер и что принимает при сохранении блюда.
// Схема проверки (zod) одна на сервер и форму — правила не разъезжаются.
import { z } from 'zod'
import { contentLocales, type ContentLocale } from './locales'

export type Localized<T> = Partial<Record<ContentLocale, T>>

/** Отметка из справочника: «Без лактозы» (для гостей) или «Новинка» (служебная) */
export interface AdminMark {
  id: number
  key: string
  names: Localized<string>
}

// Два справочника отметок (7.1): для гостей — с фильтром в меню, служебные — только значок
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
  photo: string | null
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
    photo: z
      .url({ protocol: /^https?$/, error: 'Ссылка на фото должна начинаться с http' })
      .nullable(),
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
})
export type CategoryInput = z.infer<typeof categoryInputSchema>

export const markInputSchema = z.object({ names: namesSchema })
export type MarkInput = z.infer<typeof markInputSchema>
