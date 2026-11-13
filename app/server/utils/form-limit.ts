// Защита форм сайта от потока заявок: не больше 10 отправок за 10 минут с одного адреса.
// Счётчик в памяти процесса, как у входа (login-limit.ts): для одного сервера хватает.
const MAX_SUBMITS = 10
const WINDOW_MS = 10 * 60 * 1000

const submits = new Map<string, { count: number; until: number }>()

/** Учесть отправку; false — с этого адреса уже слишком много */
export function allowFormSubmit(ip: string): boolean {
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
  return entry.count <= MAX_SUBMITS
}
