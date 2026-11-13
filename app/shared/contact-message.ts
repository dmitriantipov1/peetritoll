// Сообщение с формы «Написать нам» на странице «Контакты» (7.1): не заявка, только письмо
// сотрудникам на «почту для заявок» и сообщение в Telegram. В базе не храним — в «Заявках»
// и лидах его нет; станет видом заявки «сообщение», если заказчица захочет видеть их в админке.
// Одна схема на форму и сервер.
import { z } from 'zod'
import { contentLocales } from './locales'

const emailCheck = z.email()
const phoneRe = /^\+?[\d\s()-]{5,}$/

/** «Телефон или e-mail» — одно поле, как в прототипе. Что это — решаем по виду */
export function contactKind(value: string): 'email' | 'phone' | null {
  const v = value.trim()
  if (emailCheck.safeParse(v).success) return 'email'
  if (phoneRe.test(v) && v.replace(/\D/g, '').length >= 5) return 'phone'
  return null
}

export const contactMessageSchema = z.object({
  locale: z.enum(contentLocales),
  name: z.string().trim().min(1, 'Укажите имя').max(100, 'Имя слишком длинное'),
  contact: z
    .string()
    .trim()
    .min(1, 'Укажите телефон или e-mail')
    .max(200, 'Слишком длинно')
    .refine((v) => contactKind(v) !== null, 'Проверьте телефон или e-mail'),
  message: z
    .string()
    .trim()
    .min(1, 'Напишите сообщение')
    .max(3000, 'Сообщение слишком длинное — до 3000 знаков'),
  consent: z.literal(true, 'Нужно согласие на обработку данных'),
})
export type ContactMessage = z.infer<typeof contactMessageSchema>
