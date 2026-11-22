// «Написать нам» (22.11.2026): телефон и e-mail — отдельными полями, нужно хотя бы одно
import { describe, expect, it } from 'vitest'
import { contactMessageSchema } from '../shared/contact-message'

const base = { locale: 'ru', name: 'Тест', message: 'Вопрос', consent: true }

describe('сообщение «Написать нам»', () => {
  it('без телефона и e-mail — нельзя, ошибка у телефона', () => {
    const r = contactMessageSchema.safeParse({ ...base, phone: ' ', email: '' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0]?.path).toEqual(['phone'])
  })

  it('хватает одного — телефона или e-mail', () => {
    expect(contactMessageSchema.safeParse({ ...base, phone: '+372 5555 5555' }).success).toBe(true)
    const r = contactMessageSchema.safeParse({ ...base, email: 'guest@example.test' })
    expect(r.success && r.data.phone).toBe(null)
  })

  it('неверный e-mail или телефон — ошибка, даже если второе поле заполнено', () => {
    expect(contactMessageSchema.safeParse({ ...base, phone: '+372 5555', email: 'нет' }).success).toBe(false)
    expect(contactMessageSchema.safeParse({ ...base, phone: 'abc', email: 'a@b.ee' }).success).toBe(false)
  })
})
