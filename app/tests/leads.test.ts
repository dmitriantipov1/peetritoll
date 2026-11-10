// Лиды (8.2): ключ склейки по телефону и автотеги по источнику
import { describe, expect, it } from 'vitest'
import { autoTagFor, phoneKey } from '../shared/leads'

describe('лиды', () => {
  it('телефон для склейки — только цифры, как бы его ни записали', () => {
    expect(phoneKey('+372 5390-4478')).toBe(phoneKey('37253904478'))
    expect(phoneKey('12')).toBe(null)
    expect(phoneKey(null)).toBe(null)
  })

  it('автотег говорит, откуда пришёл человек', () => {
    expect(autoTagFor('table', {})).toBe('бронь стола')
    expect(autoTagFor('tour', { topic: 'pakri' })).toBe('Pakri Express')
    expect(autoTagFor('tour', { topic: 'exhibition' })).toBe('экскурсия')
    expect(autoTagFor('event', { eventTitle: 'Ночь музеев' })).toBe('мероприятие: Ночь музеев')
  })
})
