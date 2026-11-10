// Деньги — в центах (5,60 € = 560): ввод в админке и показ
import { describe, expect, it } from 'vitest'
import { formatPrice, parsePrice } from '../shared/money'

describe('цены', () => {
  it('принимает запятую, точку и знак евро', () => {
    expect(parsePrice('5,60')).toBe(560)
    expect(parsePrice('5.6')).toBe(560)
    expect(parsePrice('12 €')).toBe(1200)
  })

  it('не цена — null, а не ноль', () => {
    expect(parsePrice('abc')).toBe(null)
    expect(parsePrice('-3')).toBe(null)
    expect(parsePrice('1,234')).toBe(null)
  })

  it('показывает по-эстонски', () => {
    expect(formatPrice(95640)).toBe('956,40 €')
  })
})
