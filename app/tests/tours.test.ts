// Экскурсионные программы (20.11.2026): проверка формы админки и «что интересует» в заявке
import { describe, expect, it } from 'vitest'
import { tourInputSchema } from '../shared/tours'
import { requestInputSchema, tourInterest } from '../shared/requests'

const base = {
  isVisible: true,
  priceCents: 3000,
  priceUnit: 'group',
  minPeople: null,
  guide: 'Елена Малютина',
  languages: ['et', 'ru'],
  photoId: null,
  legacyPhoto: null,
  titles: { ru: 'Экспресс-экскурсия по выставке' },
  texts: {},
  durations: { ru: '20 минут' },
  terms: {},
}

describe('программа в админке', () => {
  it('без названия ни на одном языке — нельзя', () => {
    expect(tourInputSchema.safeParse({ ...base, titles: { ru: '  ' } }).success).toBe(false)
  })

  it('старая картинка — только из /images, не произвольный адрес', () => {
    expect(tourInputSchema.safeParse({ ...base, legacyPhoto: '/images/weapons-2.jpg' }).success).toBe(true)
    expect(tourInputSchema.safeParse({ ...base, legacyPhoto: 'https://evil.test/x.jpg' }).success).toBe(false)
    expect(tourInputSchema.safeParse({ ...base, legacyPhoto: '/images/../.env' }).success).toBe(false)
  })

  it('минимум человек — от 1 или без ограничения', () => {
    expect(tourInputSchema.safeParse({ ...base, minPeople: 0 }).success).toBe(false)
    expect(tourInputSchema.safeParse({ ...base, minPeople: 12 }).success).toBe(true)
  })
})

const input = {
  type: 'tour',
  locale: 'ru',
  name: 'Тест',
  phone: '+372 5555 5555',
  email: null,
  comment: null,
  marketingOptIn: false,
  consent: true,
  visitDate: '2026-12-01',
  guests: 4,
}

describe('что интересует в заявке', () => {
  it('программа — по названию снимком, по-русски', () => {
    const program = { id: 5, titles: { et: 'Kaartide saladused', ru: 'Тайны старых карт' } }
    expect(tourInterest({ topic: 'program', program })).toBe('Тайны старых карт')
  })

  it('тема без программы и старые заявки — по названию темы', () => {
    expect(tourInterest({ topic: 'radioguides' })).toBe('Радиогиды в аренду')
    expect(tourInterest({ topic: 'exhibition' })).toBe('Экскурсия по выставке')
  })

  it('старые темы с сайта больше не принимаем', () => {
    expect(requestInputSchema.safeParse({ ...input, topic: 'exhibition' }).success).toBe(false)
    expect(requestInputSchema.safeParse({ ...input, topic: 'program', programId: 5 }).success).toBe(true)
  })

  it('дата необязательна — уточняют по телефону (20.11.2026)', () => {
    const { visitDate: _, ...noDate } = input
    const parsed = requestInputSchema.safeParse({ ...noDate, topic: 'guide' })
    expect(parsed.success && parsed.data.visitDate).toBe(null)
  })
})
