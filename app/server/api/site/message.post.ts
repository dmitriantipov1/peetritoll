// Сообщение с формы «Написать нам»: POST /api/site/message → { ok: true }
// Не заявка (7.1): письмо на «почту для заявок» из настроек (Reply-To — почта гостя, если он
// оставил почту) и сообщение в Telegram, если бот настроен. В базе не храним — поэтому если
// не ушло ни письмо, ни Telegram, говорим гостю об этом, а не делаем вид, что всё в порядке.
// Защита от спама — как у заявок: ловушка website и не больше 10 отправок за 10 минут с адреса.
import { contactKind, contactMessageSchema } from '#shared/contact-message'
import { PRIVACY_POLICY_VERSION } from '#shared/requests'
import { defaultNotifications, notificationsSchema } from '#shared/site-settings'

const localeNames = { et: 'эстонская', en: 'английская', ru: 'русская' } as const

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  // Ловушка заполнена — это робот: отвечаем как обычно, но ничего не отправляем
  if (typeof body?.website === 'string' && body.website) return { ok: true }

  if (!allowFormSubmit(getRequestIP(event, { xForwardedFor: true }) ?? 'unknown')) {
    throw createError({
      statusCode: 429,
      message: 'Слишком много сообщений подряд — попробуйте через несколько минут',
    })
  }

  const msg = validateWith(contactMessageSchema)(body)
  const isEmail = contactKind(msg.contact) === 'email'
  const sentAt = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Tallinn' })

  let delivered = false

  const { email: to } = await readSetting(
    'notifications',
    notificationsSchema,
    defaultNotifications,
  )
  if (to && mailConfigured()) {
    try {
      await sendMail({
        to,
        subject: `Сообщение с сайта — ${msg.name}`,
        replyTo: isEmail ? msg.contact : undefined,
        text: [
          `Сообщение с формы «Написать нам», ${localeNames[msg.locale]} версия`,
          '',
          `Гость: ${msg.name}`,
          `${isEmail ? 'E-mail' : 'Телефон'}: ${msg.contact}`,
          '',
          msg.message,
          '',
          `Согласие на обработку данных: да, политика версии ${PRIVACY_POLICY_VERSION}, ${sentAt}`,
          isEmail
            ? 'Ответ на это письмо уйдёт гостю.'
            : 'Гость оставил телефон — ответьте звонком или сообщением.',
        ].join('\n'),
      })
      delivered = true
    } catch (e) {
      console.error('Сообщение с сайта: письмо не ушло', e)
    }
  } else {
    console.error('Сообщение с сайта: письмо не отправлено — нет почты для заявок или SMTP')
  }

  if (telegramConfigured()) {
    try {
      const e = escapeTelegram
      await sendTelegram(
        [
          '<b>Сообщение с сайта</b>',
          `${e(msg.name)} · ${e(msg.contact)}`,
          `<i>${e(msg.message.slice(0, 500))}</i>`,
        ].join('\n'),
      )
      delivered = true
    } catch (e) {
      console.error('Сообщение с сайта: Telegram не ушёл', e)
    }
  }

  if (!delivered) {
    throw createError({
      statusCode: 503,
      message: 'Сообщение не отправилось. Позвоните нам или напишите на почту',
    })
  }
  return { ok: true }
})
