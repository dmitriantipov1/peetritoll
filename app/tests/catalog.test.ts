// Единица блюда банкетного каталога (13.11.2026): «1 кг салата на 10 гостей», а не 10 кг
import { describe, expect, it } from 'vitest'
import { pricePerGuest, unitPriceLabel, unitsForGuests } from '../shared/catalog'

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
