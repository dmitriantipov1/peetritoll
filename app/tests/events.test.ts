// Запись на мероприятие (7.2): сколько мест осталось
import { describe, expect, it } from 'vitest'
import { eventPlacesLeft } from '../shared/materials'

describe('запись на мероприятие: места', () => {
  it('без лимита — мест сколько угодно', () => {
    expect(eventPlacesLeft(null, 120)).toBeNull()
  })

  it('лимит минус записавшиеся', () => {
    expect(eventPlacesLeft(30, 0)).toBe(30)
    expect(eventPlacesLeft(30, 28)).toBe(2)
  })

  it('записали сверх лимита (персонал) — мест ноль, а не минус', () => {
    expect(eventPlacesLeft(30, 33)).toBe(0)
  })
})
