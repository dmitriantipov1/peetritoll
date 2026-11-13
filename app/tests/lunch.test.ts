// Правила предзаказа обеда (7.1): на какие дни и на какое время можно заказать
import { describe, expect, it } from 'vitest'
import { preorderDates, preorderTimes } from '../shared/lunch'

const rules = { servedFrom: '12:00', servedTo: '15:00', preorderUntil: '11:00' }

describe('предзаказ обеда: дни', () => {
  it('в будни до крайнего срока — сегодня и завтра', () => {
    // 2026-11-10 — вторник
    expect(preorderDates('2026-11-10', '09:30', rules)).toEqual(['2026-11-10', '2026-11-11'])
  })

  it('после крайнего срока — только завтра', () => {
    expect(preorderDates('2026-11-10', '11:00', rules)).toEqual(['2026-11-11'])
  })

  it('в пятницу — только сегодня, в субботу — никуда, в воскресенье — на понедельник', () => {
    expect(preorderDates('2026-11-13', '09:00', rules)).toEqual(['2026-11-13'])
    expect(preorderDates('2026-11-14', '09:00', rules)).toEqual([])
    expect(preorderDates('2026-11-15', '09:00', rules)).toEqual(['2026-11-16'])
  })
})

describe('предзаказ обеда: время', () => {
  it('каждые полчаса в часы подачи, последнее — за полчаса до конца', () => {
    expect(preorderTimes('2026-11-11', '2026-11-10', '16:00', rules)).toEqual([
      '12:00',
      '12:30',
      '13:00',
      '13:30',
      '14:00',
      '14:30',
    ])
  })

  it('на сегодня — только то, что ещё не прошло', () => {
    expect(preorderTimes('2026-11-10', '2026-11-10', '10:45', rules)).toHaveLength(6)
    expect(preorderTimes('2026-11-10', '2026-11-10', '13:10', rules)).toEqual([
      '13:30',
      '14:00',
      '14:30',
    ])
  })
})
