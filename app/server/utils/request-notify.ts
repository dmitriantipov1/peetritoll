// Уведомление о новой заявке (5.4): письмо на «почту для заявок» из настроек сайта — рабочий канал,
// на него сразу можно ответить гостю (Reply-To — почта гостя); к банкету и группе — Excel (7.1).
// И сообщение в канал Telegram, если бот настроен, — информационный поток. Каждая заявка отдельно.
// Доступно в серверном коде без импорта.
//
// Сбой отправки заявку не теряет: она уже сохранена, в истории — «не ушло» с причиной.
import { eq } from 'drizzle-orm'
import { requestHistory, requests, type RequestRow } from '../db/schema'
import { fullDate, weekday } from '#shared/dates'
import { formatPrice } from '#shared/money'
import { plural } from '#shared/plural'
import { requestTypeNames, ruFirst } from '#shared/requests'
import { defaultNotifications, notificationsSchema } from '#shared/site-settings'

const weekdays = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']
const localeNames = { et: 'эстонская', en: 'английская', ru: 'русская' } as const

/** Адрес сайта для ссылок в письмах — NUXT_PUBLIC_I18N_BASE_URL */
function siteUrl(): string {
  const base = useRuntimeConfig().public.i18n?.baseUrl
  return (typeof base === 'string' && base ? base : 'http://localhost:3000').replace(/\/$/, '')
}

function visitLine(row: RequestRow): string {
  const parts: string[] = []
  if (row.visitDate) {
    parts.push(
      `${weekdays[weekday(row.visitDate) - 1]}, ${fullDate(row.visitDate)}${row.visitTime ? `, ${row.visitTime}` : ''}`,
    )
  }
  if (row.guests) parts.push(`${row.guests} ${plural(row.guests, ['гость', 'гостя', 'гостей'])}`)
  return parts.join(' · ')
}

/** «Бронь стола № 1008 — Андрес Тамм, чт, 12.11.2026, 19:30 · 4 гостя» */
function subject(row: RequestRow): string {
  const visit = visitLine(row)
  return `${requestTypeNames[row.type]} № ${row.id} — ${row.name}${visit ? `, ${visit}` : ''}`
}

function calcText(row: RequestRow): string[] {
  if (!row.calc?.lines.length) return []
  const lines = row.calc.lines.map(
    (l) =>
      `  ${l.ref.kind === 'groupMenu' ? `${ruFirst(l.category)} «${ruFirst(l.names)}»` : ruFirst(l.names)} — ${l.qty} × ${formatPrice(l.priceCents)} = ${formatPrice(l.priceCents * l.qty)}`,
  )
  return [
    'Расчёт:',
    ...lines,
    `Ориентировочно: ${formatPrice(row.calc.totalCents)}`,
    'Предварительный расчёт, не является офертой.',
    '',
  ]
}

function mailText(row: RequestRow, link: string): string {
  const source =
    row.source === 'site' ? `с сайта, ${localeNames[row.locale]} версия` : 'внесена вручную'
  return [
    `${requestTypeNames[row.type]} № ${row.id} — ${source}`,
    '',
    visitLine(row) && `Визит: ${visitLine(row)}`,
    requestSummary(row, false) && `Подробности: ${requestSummary(row, false)}`,
    '',
    `Гость: ${row.name}`,
    `Телефон: ${row.phone}`,
    row.email ? `E-mail: ${row.email}` : 'E-mail: не указан',
    `Рассылка: ${row.marketingOptIn ? 'согласен(на)' : 'нет'}`,
    '',
    row.comment ? `Комментарий гостя:\n${row.comment}\n` : '',
    ...calcText(row),
    `Открыть в админке: ${link}`,
    row.email ? 'Ответ на это письмо уйдёт гостю.' : '',
  ]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
}

function telegramText(row: RequestRow, link: string): string {
  const e = escapeTelegram
  return [
    `<b>${e(requestTypeNames[row.type])} № ${row.id}</b>`,
    `${e(row.name)} · ${e(row.phone)}`,
    visitLine(row) && e(visitLine(row)),
    requestSummary(row, false) && e(requestSummary(row, false)),
    row.comment ? `<i>${e(row.comment.slice(0, 300))}</i>` : '',
    `<a href="${e(link)}">Открыть в админке</a>`,
  ]
    .filter(Boolean)
    .join('\n')
}

async function logNotified(requestId: number, note: string) {
  await useDb().insert(requestHistory).values({ requestId, kind: 'notified', note })
}

/** Отправить уведомления о заявке. Ошибки не бросает — пишет их в историю заявки */
export async function notifyNewRequest(id: number) {
  const [row] = await useDb().select().from(requests).where(eq(requests.id, id)).limit(1)
  if (!row) return
  const link = `${siteUrl()}/admin/requests/${row.id}`

  const { email: to } = await readSetting(
    'notifications',
    notificationsSchema,
    defaultNotifications,
  )
  if (!to) {
    await logNotified(id, 'Письмо не отправлено: в настройках сайта нет почты для заявок')
  } else if (!mailConfigured()) {
    await logNotified(id, 'Письмо не отправлено: почта на сервере не настроена')
  } else {
    try {
      const withExcel = row.type === 'banquet' || row.type === 'group'
      await sendMail({
        to,
        subject: subject(row),
        text: mailText(row, link),
        replyTo: row.email ?? undefined,
        attachments: withExcel
          ? [
              {
                filename: requestExcelName(row),
                content: await requestExcel(row),
                contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              },
            ]
          : undefined,
      })
      await logNotified(id, `Письмо на ${to}${withExcel ? ' с Excel' : ''}`)
    } catch (e) {
      console.error(`Заявка № ${id}: письмо не ушло`, e)
      await logNotified(id, `Письмо на ${to} не ушло: ${(e as Error).message}`)
    }
  }

  if (telegramConfigured()) {
    try {
      await sendTelegram(telegramText(row, link))
      await logNotified(id, 'Сообщение в Telegram')
    } catch (e) {
      console.error(`Заявка № ${id}: Telegram не ушёл`, e)
      await logNotified(id, `Telegram не ушёл: ${(e as Error).message}`)
    }
  }
}
