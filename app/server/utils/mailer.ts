// Отправка писем через SMTP (nodemailer). Доступно в серверном коде без импорта.
// В разработке SMTP — Mailpit из docker-compose.yml (письма видно на http://localhost:8025),
// на боевом сервере — почтовый сервис из .env (NUXT_SMTP_*).
import nodemailer, { type Transporter } from 'nodemailer'

export interface MailAttachment {
  filename: string
  content: Buffer
  contentType?: string
}

export interface Mail {
  to: string
  subject: string
  text: string
  html?: string
  replyTo?: string
  attachments?: MailAttachment[]
}

let transport: Transporter | undefined

function smtp() {
  return useRuntimeConfig().smtp
}

/** Настроена ли почта: без хоста письма не отправляем */
export function mailConfigured(): boolean {
  return !!smtp().host
}

export async function sendMail(mail: Mail) {
  const config = smtp()
  if (!config.host) throw new Error('Почта не настроена: нет NUXT_SMTP_HOST')
  const port = Number(config.port)
  transport ??= nodemailer.createTransport({
    host: config.host,
    port,
    // 465 — шифрование сразу; 587 и Mailpit (1025) — без него или через STARTTLS
    secure: port === 465,
    auth: config.user ? { user: config.user, pass: config.pass } : undefined,
  })
  await transport.sendMail({ from: config.from, ...mail })
}
