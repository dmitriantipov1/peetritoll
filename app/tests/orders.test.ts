// Заказы магазина (7.3): способы получения, доставка только на физическое, форма оформления
import { describe, expect, it } from 'vitest'
import {
  deliveryChoices,
  orderInputSchema,
  orderTotals,
  type OrderRuleLine,
} from '../shared/orders'

const settings = { deliveryEstoniaCents: 400, deliveryEuCents: 1200 }
const book: OrderRuleLine = { kind: 'physical', pickupOnly: false, priceCents: 1500, qty: 2 }
const pdf: OrderRuleLine = { kind: 'digital', pickupOnly: false, priceCents: 1000, qty: 1 }
const samovar: OrderRuleLine = { kind: 'physical', pickupOnly: true, priceCents: 12000, qty: 1 }

describe('заказы', () => {
  it('способ получения зависит от корзины', () => {
    expect(deliveryChoices([pdf])).toEqual(['none'])
    expect(deliveryChoices([book, pdf])).toEqual(['pickup', 'parcel', 'eu'])
    // Антиквариат почтой не отправляем — весь заказ только самовывозом
    expect(deliveryChoices([book, samovar])).toEqual(['pickup'])
  })

  it('доставка — из настроек, одна на заказ, цифровое её не добавляет', () => {
    expect(orderTotals([book, pdf], 'parcel', settings)).toEqual({
      goodsCents: 4000,
      deliveryCents: 400,
      totalCents: 4400,
    })
    expect(orderTotals([book], 'eu', settings).deliveryCents).toBe(1200)
    expect(orderTotals([book], 'pickup', settings).deliveryCents).toBe(0)
    expect(orderTotals([pdf], 'none', settings).totalCents).toBe(1000)
  })

  it('почтомату и почте в ЕС нужен адрес', () => {
    const base = {
      locale: 'ru',
      name: 'Тест',
      email: 'Test@Peetritoll.test',
      lines: [{ variantId: 1, qty: 1, priceCents: 1000 }],
    }
    expect(orderInputSchema.safeParse({ ...base, delivery: 'parcel' }).success).toBe(false)
    const ok = orderInputSchema.parse({
      ...base,
      delivery: 'parcel',
      carrier: 'Omniva',
      parcelPoint: 'Paldiski Rimi',
    })
    expect(ok.email).toBe('test@peetritoll.test')
    expect(ok.phone).toBe(null)
    expect(orderInputSchema.safeParse({ ...base, delivery: 'eu', country: 'FI' }).success).toBe(
      false,
    )
    const twice = { ...base, delivery: 'pickup', lines: [base.lines[0], base.lines[0]] }
    expect(orderInputSchema.safeParse(twice).success).toBe(false)
  })
})
