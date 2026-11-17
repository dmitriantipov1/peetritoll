// Хэштеги и цитата новости (16.11.2026): строка из поля админки → как хранить и показывать
import { describe, expect, it } from 'vitest'
import { cleanQuote, formatTags, MAX_TAGS, parseTags } from '../shared/materials'

describe('хэштеги новости', () => {
  it('пробелы, запятые, «#» не обязателен', () => {
    expect(parseTags('#НочьМузеев, #Палдиски  Музей')).toEqual(['НочьМузеев', 'Палдиски', 'Музей'])
  })

  it('пусто и одни решётки — без хэштегов', () => {
    expect(parseTags('')).toEqual([])
    expect(parseTags(' # ## ')).toEqual([])
  })

  it('повторы без учёта регистра убираются, остаётся первый', () => {
    expect(parseTags('#Палдиски #палдиски Paldiski')).toEqual(['Палдиски', 'Paldiski'])
  })

  it('не больше MAX_TAGS', () => {
    const many = Array.from({ length: 12 }, (_, i) => `tag${i}`).join(' ')
    expect(parseTags(many)).toHaveLength(MAX_TAGS)
  })

  it('туда и обратно', () => {
    expect(formatTags(parseTags('НочьМузеев Палдиски'))).toBe('#НочьМузеев #Палдиски')
  })
})

describe('цитата новости', () => {
  it('кавычки по краям убираются — их ставит сайт', () => {
    expect(cleanQuote('«Спасибо за доверие!»')).toBe('Спасибо за доверие!')
    expect(cleanQuote('  "Спасибо"  ')).toBe('Спасибо')
    expect(cleanQuote('Без кавычек')).toBe('Без кавычек')
  })

  it('кавычки внутри остаются', () => {
    expect(cleanQuote('Книга «Байки» — лучшая')).toBe('Книга «Байки» — лучшая')
  })
})
