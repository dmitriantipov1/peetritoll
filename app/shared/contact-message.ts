// Сообщение с формы «Написать нам» на странице «Контакты» (7.1): не заявка, только письмо
// сотрудникам на «почту для заявок» и сообщение в Telegram. В базе не храним — в «Заявках»
// и лидах его нет; станет видом заявки «сообщение», если заказчица захочет видеть их в админке.
// Одна схема на форму и сервер. Телефон и e-mail — отдельными полями, нужно хотя бы одно (22.11.2026).
import { z } from 'zod'
import { contentLocales } from './locales'

const emailCheck = z.email()
const phoneRe = /^\+?[\d\s()-]{5,}$/

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, 'Слишком длинно')
    .default('')
    .transform((v) => v || null)

export const contactMessageSchema = z
  .object({
    locale: z.enum(contentLocales),
    name: z.string().trim().min(1, 'Укажите имя').max(100, 'Имя слишком длинное'),
    phone: optional(40).refine(
      (v) => v === null || (phoneRe.test(v) && v.replace(/\D/g, '').length >= 5),
      'Проверьте телефон',
    ),
    email: optional(200).refine(
      (v) => v === null || emailCheck.safeParse(v).success,
      'Проверьте e-mail',
    ),
    message: z
    .string()
    .trim()
    .min(1, 'Напишите сообщение')
    .max(3000, 'Сообщение слишком длинное — до 3000 знаков'),
    consent: z.literal(true, 'Нужно согласие на обработку данных'),
  })
  .refine((m) => m.phone || m.email, { message: 'Укажите телефон или e-mail', path: ['phone'] })
export type ContactMessage = z.infer<typeof contactMessageSchema>
