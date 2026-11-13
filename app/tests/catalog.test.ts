// Единица блюда банкетного каталога (13.11.2026): «1 кг салата на 10 гостей», а не 10 кг
import { describe, expect, it } from 'vitest'
import {
  banquetRequestProblem,
  banquetShortfall,
  pricePerGuest,
  unitPriceLabel,
  unitsForGuests,
} from '../shared/catalog'

describe('банкет: количество по числу гостей', () => {
  it('порция на одного — по гостю', () => {
    expect(unitsForGuests(10, 1)).toBe(10)
  })

  it('1 кг на 10 гостей: 10 гостей — 1 кг, 12 — 2 кг (вверх)', () => {
    expect(unitsForGuests(10, 10)).toBe(1)
    expect(unitsForGuests(12, 10)).toBe(2)
  })

  it('без гостей — ничего', () => {
    expect(unitsForGuests(0, 10)).toBe(0)
  })
})

describe('банкет: цена на гостя', () => {
  it('порция — как есть, «на 10 гостей» — десятая часть', () => {
    expect(pricePerGuest(650, 1)).toBe(650)
    expect(pricePerGuest(1200, 10)).toBe(120)
  })

  it('подпись цены: порция — просто цена, иначе за единицу и на сколько гостей', () => {
    expect(unitPriceLabel({ priceCents: 650, unit: 'portion', servesGuests: 1 })).toBe('6,50 €')
    expect(unitPriceLabel({ priceCents: 1200, unit: 'kg', servesGuests: 10 })).toBe(
      '12,00 € / кг · на 10 гостей',
    )
  })
})

describe('банкет: подсказка «мало горячего»', () => {
  const settings = { warnCategoryId: 2, warnMinPerGuest: 1 }
  const hot = (qty: number, servesGuests = 1) => ({ qty, servesGuests, categoryId: 2 })
  const salad = { qty: 20, servesGuests: 1, categoryId: 1 }

  it('горячего на всех — подсказки нет', () => {
    expect(banquetShortfall([salad, hot(20)], 20, settings)).toBeNull()
  })

  it('горячего меньше, чем гостей, — на сколько хватает', () => {
    expect(banquetShortfall([salad, hot(5)], 20, settings)).toBe(5)
  })

  it('считаем гостей, а не единицы: 2 блюда «на 10» хватает на 20', () => {
    expect(banquetShortfall([salad, hot(2, 10)], 20, settings)).toBeNull()
  })

  it('ничего не выбрано или категория не задана — молчим', () => {
    expect(banquetShortfall([hot(0)], 20, settings)).toBeNull()
    expect(banquetShortfall([salad], 20, { ...settings, warnCategoryId: null })).toBeNull()
  })
})

describe('банкет: запрос с сайта', () => {
  const settings = { capacityMin: 10, capacityMax: 40, leadDays: 3 }
  const today = '2026-11-13'

  it('в вместимость и не раньше срока — можно', () => {
    expect(banquetRequestProblem(20, '2026-11-16', today, settings)).toBeNull()
  })

  it('гостей меньше или больше вместимости зала', () => {
    expect(banquetRequestProblem(9, '2026-11-20', today, settings)).toBe('capacity')
    expect(banquetRequestProblem(41, '2026-11-20', today, settings)).toBe('capacity')
  })

  it('раньше чем через 3 дня — поздно', () => {
    expect(banquetRequestProblem(20, '2026-11-15', today, settings)).toBe('lead')
  })
})
