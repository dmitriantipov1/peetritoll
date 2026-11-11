// Проверка данных заявки (7.1, 7.2): что форма сайта и админка обязаны прислать
import { describe, expect, it } from 'vitest'
import { requestInputSchema, requestSection } from '../shared/requests'

const guest = { locale: 'ru', name: 'Анна', phone: '+372 5555 1234' }
const table = { ...guest, type: 'table', visitDate: '2026-11-20', visitTime: '19:00', guests: 2 }

describe('заявка', () => {
  it('бронь стола: телефон обязателен, почта — нет', () => {
    const ok = requestInputSchema.safeParse({ ...table, email: '' })
    expect(ok.success && ok.data.email).toBe(null)
    expect(requestInputSchema.safeParse({ ...table, phone: '' }).success).toBe(false)
  })

  it('время — ЧЧ:ММ, гостей — хотя бы один', () => {
    expect(requestInputSchema.safeParse({ ...table, visitTime: '25:00' }).success).toBe(false)
    expect(requestInputSchema.safeParse({ ...table, guests: 0 }).success).toBe(false)
  })

  it('предзаказ обеда без единой позиции не принимается', () => {
    const lunch = { ...guest, type: 'lunch', visitDate: '2026-11-20', visitTime: '13:00' }
    expect(requestInputSchema.safeParse({ ...lunch, items: { soup: 0, main: 0 } }).success).toBe(
      false,
    )
    expect(requestInputSchema.safeParse({ ...lunch, items: { soup: 0, main: 2 } }).success).toBe(
      true,
    )
  })

  it('банкет без выбранных блюд — можно: заявка не заказ, отправку не блокируем', () => {
    const banquet = { ...table, type: 'banquet', guests: 20, items: [] }
    expect(requestInputSchema.safeParse(banquet).success).toBe(true)
  })

  it('группа: обед можно не выбирать — обсудят по телефону', () => {
    const group = { ...table, type: 'group', guests: 30 }
    const parsed = requestInputSchema.safeParse(group)
    expect(parsed.success && parsed.data.type === 'group' && parsed.data.menuId).toBe(null)
    expect(requestInputSchema.safeParse({ ...group, menuId: 3 }).success).toBe(true)
  })

  it('группа: дату и время приезда можно не указывать', () => {
    const { visitDate: _d, visitTime: _t, ...noVisit } = table
    const parsed = requestInputSchema.safeParse({ ...noVisit, type: 'group', guests: 30 })
    expect(parsed.success && parsed.data.type === 'group' && parsed.data.visitDate).toBe(null)
    // у брони стола дата по-прежнему обязательна
    expect(requestInputSchema.safeParse(noVisit).success).toBe(false)
  })

  it('заявки группы открывает право на банкеты', () => {
    expect(requestSection.group).toBe('requests.banquet')
  })
})
