// Защита входа от перебора паролей: не больше 5 неудачных попыток за 15 минут
// с одного адреса на одну почту. Счётчик в памяти процесса — для одного сервера хватает,
// после перезапуска обнуляется.
const MAX_FAILS = 5
const WINDOW_MS = 15 * 60 * 1000

const fails = new Map<string, { count: number; until: number }>()

function key(ip: string, email: string) {
  return `${ip}|${email}`
}

/** Сколько минут ждать, если попытки исчерпаны; 0 — можно пробовать. */
export function loginBlockedFor(ip: string, email: string): number {
  const entry = fails.get(key(ip, email))
  if (!entry || entry.until < Date.now()) return 0
  return entry.count >= MAX_FAILS ? Math.ceil((entry.until - Date.now()) / 60000) : 0
}

export function registerLoginFail(ip: string, email: string) {
  // Чтобы память не росла от перебора разных адресов, убираем истёкшие записи
  if (fails.size > 1000) {
    const now = Date.now()
    for (const [k, entry] of fails) if (entry.until < now) fails.delete(k)
  }
  const k = key(ip, email)
  const entry = fails.get(k)
  if (!entry || entry.until < Date.now()) {
    fails.set(k, { count: 1, until: Date.now() + WINDOW_MS })
  } else {
    entry.count++
  }
}

export function resetLoginFails(ip: string, email: string) {
  fails.delete(key(ip, email))
}
