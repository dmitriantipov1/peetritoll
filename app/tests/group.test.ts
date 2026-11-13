// Запрос группы (7.1): не позже чем за N часов до приезда; дата и время необязательны
import { describe, expect, it } from 'vitest'
import { groupLeadOk } from '../shared/group-menus'

// 13.11.2026, 12:00 по Таллину (зима, UTC+2)
const now = new Date('2026-11-13T10:00:00Z')

describe('запрос группы: срок заказа', () => {
  it('без даты — принимаем: обсудят по телефону', () => {
    expect(groupLeadOk(null, null, 24, now)).toBe(true)
  })

  it('за сутки — можно ровно через 24 часа, раньше — нельзя', () => {
    expect(groupLeadOk('2026-11-14', '12:00', 24, now)).toBe(true)
    expect(groupLeadOk('2026-11-14', '11:30', 24, now)).toBe(false)
  })

  it('без времени — по концу дня приезда', () => {
    expect(groupLeadOk('2026-11-14', null, 24, now)).toBe(true)
    expect(groupLeadOk('2026-11-13', null, 24, now)).toBe(false)
  })
})
