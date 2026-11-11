// Групповое меню — «Трапезы групп» (7.1, ответы заказчицы 12.11.2026): готовые комплексные
// обеды для экскурсионных групп, без калькулятора. У обеда номер, название, состав и цена
// с человека; группа выбирает обед в форме запроса. Одна схема zod на сервер и форму.
import { z } from 'zod'
import { contentLocales } from './locales'
import type { Localized } from './menu'

export interface AdminGroupMenu {
  id: number
  /** «Меню № 3» — по нему обед называют по телефону; список упорядочен по номеру */
  number: number
  priceCents: number
  isVisible: boolean
  names: Localized<string>
  /** Состав — по строке на блюдо */
  items: Localized<string>
}

export interface GroupSettings {
  /** Минимум человек в группе */
  minPeople: number
  /** Заказ не позже чем за столько часов до приезда */
  leadHours: number
}

export const defaultGroupSettings: GroupSettings = { minPeople: 10, leadHours: 24 }

export interface AdminGroupMenus {
  menus: AdminGroupMenu[]
  settings: GroupSettings
}

/** «Меню № 3» на языке строки расчёта заявки */
export const groupMenuTitles: Required<Localized<(n: number) => string>> = {
  et: (n) => `Menüü nr ${n}`,
  en: (n) => `Menu No. ${n}`,
  ru: (n) => `Меню № ${n}`,
}

/** Строки состава без пустых */
export function menuItemLines(text: string | undefined | null) {
  return (text ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

// ---------- Проверка ----------

export const groupMenuInputSchema = z
  .object({
    number: z.number().int().min(1, 'Номер — от 1').max(999),
    priceCents: z.number().int().min(0).max(1_000_000),
    isVisible: z.boolean(),
    names: z.partialRecord(z.enum(contentLocales), z.string().trim().max(100)),
    items: z.partialRecord(z.enum(contentLocales), z.string().trim().max(2000)),
  })
  .refine((m) => Object.values(m.names).some(Boolean), {
    message: 'Нужно название хотя бы на одном языке',
    path: ['names'],
  })
export type GroupMenuInput = z.infer<typeof groupMenuInputSchema>

export const groupSettingsSchema = z.object({
  minPeople: z.number().int().min(1).max(1000),
  leadHours: z
    .number()
    .int()
    .min(0)
    .max(24 * 60),
})
