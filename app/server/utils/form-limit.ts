// Защита форм сайта от потока заявок: не больше N отправок за 10 минут с одного адреса.
// Счётчик у каждой формы свой (28.11.2026): раньше был один на все, и оформление заказа
// с «Оплатить ещё раз» съедали лимит заявок. Счётчик в памяти процесса, как у входа
// (login-limit.ts): для одного сервера хватает.
const LIMITS = {
  request: 10,
  message: 10,
  subscribe: 10,
  order: 10,
  // «Оплатить ещё раз»: покупатель может несколько раз уйти со страницы SumUp и вернуться
  pay: 20,
} as const
export type FormKind = keyof typeof LIMITS
const WINDOW_MS = 10 * 60 * 1000

const submits = new Map<string, { count: number; until: number }>()

/** Учесть отправку формы; false — с этого адреса уже слишком много */
export function allowFormSubmit(form: FormKind, ipAddress: string): boolean {
  const ip = `${form}:${ipAddress}`
  const now = Date.now()
  if (submits.size > 1000) {
    for (const [k, entry] of submits) if (entry.until < now) submits.delete(k)
  }
  const entry = submits.get(ip)
  if (!entry || entry.until < now) {
    submits.set(ip, { count: 1, until: now + WINDOW_MS })
    return true
  }
  entry.count++
  return entry.count <= LIMITS[form]
}
