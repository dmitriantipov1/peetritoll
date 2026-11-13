// Бронь стола (7.1): время по часам работы, особые дни, последняя бронь и срок онлайн-брони
import { describe, expect, it } from 'vitest'
import { bookingTimes, hoursOn, isBanquetSize } from '../shared/table-booking'
import { defaultHours, type HoursSettings } from '../shared/contacts'

// пн–чт 11–18, пт–вс 11–19; последняя бронь за 60 мин до закрытия; онлайн — за 2 ч
const hours: HoursSettings = { ...defaultHours, specialDays: [] }
// 13.11.2026 — пятница, 12:00 по Таллину (зима, UTC+2)
const now = new Date('2026-11-13T10:00:00Z')

describe('бронь стола: время', () => {
  it('обычный день: с открытия до часа перед закрытием, каждые полчаса', () => {
    // 16.11 — понедельник, 11:00–18:00 → последняя бронь 17:00
    const times = bookingTimes('2026-11-16', hours, now)
    expect(times[0]).toBe('11:00')
    expect(times.at(-1)).toBe('17:00')
    expect(times).toHaveLength(13)
  })

  it('сегодня — не раньше чем через 2 часа от «сейчас»', () => {
    // пятница 11:00–19:00, сейчас 12:00 → с 14:00 до 18:00
    expect(bookingTimes('2026-11-13', hours, now)).toEqual([
      '14:00',
      '14:30',
      '15:00',
      '15:30',
      '16:00',
      '16:30',
      '17:00',
      '17:30',
      '18:00',
    ])
  })

  it('выходной день недели — пусто', () => {
    const closedMonday = {
      ...hours,
      week: hours.week.map((d, i) => (i === 0 ? { ...d, open: false } : d)),
    }
    expect(bookingTimes('2026-11-16', closedMonday, now)).toEqual([])
  })

  it('особый день важнее расписания: закрыто или короткий день', () => {
    const special: HoursSettings = {
      ...hours,
      specialDays: [
        { date: '2026-12-24', open: false, from: '11:00', to: '18:00', label: {} },
        { date: '2026-12-31', open: true, from: '11:00', to: '16:00', label: {} },
      ],
    }
    expect(hoursOn('2026-12-24', special).open).toBe(false)
    expect(bookingTimes('2026-12-24', special, now)).toEqual([])
    expect(bookingTimes('2026-12-31', special, now).at(-1)).toBe('15:00')
  })

  it('прошедший день — пусто', () => {
    expect(bookingTimes('2026-11-12', hours, now)).toEqual([])
  })
})

describe('бронь стола: банкет', () => {
  it('с порога гостей — уже банкет', () => {
    expect(isBanquetSize(11, hours)).toBe(false)
    expect(isBanquetSize(12, hours)).toBe(true)
  })
})
