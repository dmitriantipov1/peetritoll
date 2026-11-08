// Вход в админку: POST /api/auth/login { email, password, remember }
import { eq } from 'drizzle-orm'
import { users } from '../../db/schema'

const REMEMBER_MAX_AGE = 60 * 60 * 24 * 30 // «Запомнить меня» — 30 дней

// Если почты нет в базе, всё равно проверяем пароль — против заранее посчитанного хэша.
// Иначе по времени ответа можно узнать, какие адреса заведены.
let dummyHash: Promise<string> | undefined

export default defineEventHandler(async (event) => {
  const body = await readBody<{ email?: unknown; password?: unknown; remember?: unknown }>(event)
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const remember = body?.remember === true

  if (!email || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Введите почту и пароль' })
  }

  const ip = getRequestIP(event) ?? 'unknown'
  const wait = loginBlockedFor(ip, email)
  if (wait > 0) {
    throw createError({
      statusCode: 429,
      statusMessage: `Слишком много попыток. Попробуйте через ${wait} мин.`,
    })
  }

  const [user] = await useDb().select().from(users).where(eq(users.email, email)).limit(1)

  dummyHash ??= hashPassword('peetri-toll-dummy-password')
  const hash = user?.isActive && user.passwordHash ? user.passwordHash : await dummyHash
  const ok = (await verifyPassword(hash, password)) && !!user?.isActive && !!user.passwordHash

  if (!user || !ok) {
    registerLoginFail(ip, email)
    // Одинаковый ответ для «нет такой почты», «неверный пароль» и «отключён»
    throw createError({ statusCode: 401, statusMessage: 'Неверная почта или пароль' })
  }

  resetLoginFails(ip, email)

  // Если настройки хэширования стали строже, пересчитываем хэш при входе
  const update: Partial<typeof users.$inferInsert> = { lastLoginAt: new Date() }
  if (passwordNeedsReHash(user.passwordHash!)) update.passwordHash = await hashPassword(password)
  await useDb().update(users).set(update).where(eq(users.id, user.id))

  await replaceUserSession(
    event,
    { user: { id: user.id }, loggedInAt: Date.now() },
    remember ? { maxAge: REMEMBER_MAX_AGE } : undefined,
  )

  return toAdminUser(user)
})
