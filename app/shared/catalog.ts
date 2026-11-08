// Банкетное и групповое меню — каталоги для калькуляторов (7.1). Одна схема zod на сервер и форму.
import { z } from 'zod'
import { contentLocales } from './locales'
import type { Localized } from './menu'

export const catalogKinds = ['banquet', 'group'] as const
export type CatalogKind = (typeof catalogKinds)[number]

export const catalogTitles: Record<CatalogKind, string> = {
  banquet: 'Банкетное',
  group: 'Групповое',
}

export interface AdminCatalogDish {
  id: number
  categoryId: number
  names: Localized<string>
  priceCents: number
  previousPriceCents: number | null
  priceChangedAt: string | null
  isAvailable: boolean
}

export interface AdminCatalogCategory {
  id: number
  names: Localized<string>
  dishes: AdminCatalogDish[]
}

// ---------- Настройки калькуляторов (таблица settings) ----------

export interface BanquetSettings {
  /** Вместимость зала: от и до гостей */
  capacityMin: number
  capacityMax: number
  /** Запрос не позже чем за столько дней до события */
  leadDays: number
  /** Подсказка гостю над калькулятором */
  hint: Localized<string>
  /** Мягкое предупреждение: в этой категории меньше N порций на гостя (обычно «Горячее») */
  warnCategoryId: number | null
  warnMinPerGuest: number
}

export interface GroupSettings {
  /** Минимум человек в группе */
  minPeople: number
  /** Заказ не позже чем за столько часов до приезда */
  leadHours: number
  hint: Localized<string>
}

export const defaultBanquetSettings: BanquetSettings = {
  capacityMin: 10,
  capacityMax: 40,
  leadDays: 3,
  hint: { ru: 'Обычно берут 2–3 закуски и одно горячее на человека.' },
  warnCategoryId: null,
  warnMinPerGuest: 1,
}

export const defaultGroupSettings: GroupSettings = {
  minPeople: 10,
  leadHours: 24,
  hint: { ru: 'Выберите блюда для группы — посчитаем ориентировочную сумму.' },
}

export interface AdminCatalog {
  kind: CatalogKind
  categories: AdminCatalogCategory[]
  settings: BanquetSettings | GroupSettings
}

// ---------- Проверка ----------

const names = (max: number) =>
  z
    .partialRecord(z.enum(contentLocales), z.string().trim().max(max))
    .refine((v) => Object.values(v).some(Boolean), 'Нужно название хотя бы на одном языке')

const hint = z.partialRecord(z.enum(contentLocales), z.string().trim().max(500))

export const catalogDishInputSchema = z.object({
  categoryId: z.number().int().positive(),
  names: names(200),
  priceCents: z.number().int().min(0).max(1_000_000),
  isAvailable: z.boolean(),
})
export type CatalogDishInput = z.infer<typeof catalogDishInputSchema>

export const catalogCategoryInputSchema = z.object({ names: names(100) })

export const banquetSettingsSchema = z
  .object({
    capacityMin: z.number().int().min(1).max(1000),
    capacityMax: z.number().int().min(1).max(1000),
    leadDays: z.number().int().min(0).max(365),
    hint,
    warnCategoryId: z.number().int().positive().nullable(),
    warnMinPerGuest: z.number().min(0).max(10),
  })
  .refine((s) => s.capacityMin <= s.capacityMax, {
    message: 'Вместимость «от» не больше, чем «до»',
    path: ['capacityMax'],
  })

export const groupSettingsSchema = z.object({
  minPeople: z.number().int().min(1).max(1000),
  leadHours: z
    .number()
    .int()
    .min(0)
    .max(24 * 60),
  hint,
})
