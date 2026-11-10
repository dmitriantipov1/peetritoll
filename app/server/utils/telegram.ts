// Сообщение в канал Telegram через Bot API (5.4): заказчица видит поток заявок, не отвечая в нём.
// Доступно в серверном коде без импорта. Бот и канал — NUXT_TELEGRAM_BOT_TOKEN и NUXT_TELEGRAM_CHAT_ID,
// как завести — app/README.md, «Уведомления».

export function telegramConfigured(): boolean {
  const { botToken, chatId } = useRuntimeConfig().telegram
  return !!botToken && !!chatId
}

/** Текст с разметкой HTML Telegram: <b>, <i>, <a href>. Спецсимволы в данных — через escapeTelegram */
export async function sendTelegram(html: string) {
  const { botToken, chatId } = useRuntimeConfig().telegram
  if (!botToken || !chatId) throw new Error('Telegram не настроен')
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: html,
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    }),
    signal: AbortSignal.timeout(10_000),
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { description?: string } | null
    // Токен в текст ошибки не попадает: в нём только ответ Telegram
    throw new Error(`Telegram: ${body?.description ?? res.status}`)
  }
}

export function escapeTelegram(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
