// Заявка с формы сайта: POST /api/site/requests → { id }
// Пока принимаем предзаказ обеда и запрос группы (формы остальных видов — следующими срезами).
// Согласие на обработку обязательно (8.1), его время и версия политики сохраняются с заявкой.
// Защита от спама: поле-ловушка website (люди его не видят и не заполняют) и не больше
// 10 отправок за 10 минут с одного адреса.
import { z } from 'zod'
import { requestInputSchema } from '#shared/requests'

const formSchema = z.object({
  consent: z.literal(true, 'Нужно согласие на обработку данных'),
  website: z.string().max(0).optional(),
})

const publicTypes = ['lunch', 'group'] as const

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  // Ловушка заполнена — это робот: отвечаем как обычно, но заявку не заводим
  if (typeof body?.website === 'string' && body.website) return { id: 0 }

  if (!allowFormSubmit(getRequestIP(event, { xForwardedFor: true }) ?? 'unknown')) {
    throw createError({
      statusCode: 429,
      message: 'Слишком много заявок подряд — попробуйте через несколько минут',
    })
  }

  const { consent } = validateWith(formSchema)(body)
  const input = validateWith(requestInputSchema)(body)
  if (!(publicTypes as readonly string[]).includes(input.type)) {
    throw createError({ statusCode: 400, message: 'Такую заявку с сайта пока не принимаем' })
  }

  const sections = await readSections()
  const section =
    input.type === 'lunch' ? sections.lunch : input.type === 'group' ? sections.group : null
  if (section && (!section.enabled || !section.locales[input.locale])) {
    throw createError({ statusCode: 404, message: 'Этот раздел сейчас не принимает заявки' })
  }

  return { id: await createRequest(input, { source: 'site', consent }) }
})
