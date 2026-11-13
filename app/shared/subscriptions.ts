// Подписка на рассылку с сайта (8.2): одна схема на форму и сервер.
import { z } from 'zod'
import { contentLocales } from './locales'

/** Ссылка из письма действует столько часов */
export const SUBSCRIBE_LINK_HOURS = 48

/** Повторное письмо на тот же адрес — не чаще, минут: чтобы формой не засыпали чужой ящик */
export const SUBSCRIBE_RESEND_MINUTES = 10

export const subscribeInputSchema = z.object({
  locale: z.enum(contentLocales),
  email: z.string().trim().toLowerCase().max(200).pipe(z.email('Проверьте e-mail')),
  consent: z.literal(true, 'Нужно согласие на обработку данных'),
})

export const subscribeConfirmSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{20,100}$/, 'Ссылка повреждена'),
})

/** Что увидит гость, открыв ссылку и нажав «Подтвердить» */
export type SubscribeConfirmResult = 'confirmed' | 'already' | 'expired' | 'unknown'
