// Кто вошёл в админку и что ему можно. Доступно в серверном коде без импорта.
import type { H3Event } from 'h3'
import { eq } from 'drizzle-orm'
import { users, type UserRow } from '../db/schema'
import { accessTo, allows, type AccessLevel, type Section } from '#shared/access'
import type { AdminUser } from '#shared/admin-user'

export function toAdminUser(row: UserRow): AdminUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    permissions: row.permissions,
  }
}

/**
 * Сотрудник текущей сессии или null. Не вошёл — всё равно что:
 * отключённый, а также тот, у кого пароль сменили после входа (сброс выкидывает отовсюду).
 */
export async function getAdminUser(event: H3Event): Promise<UserRow | null> {
  const session = await getUserSession(event)
  const id = session.user?.id
  if (!id) return null

  const [row] = await useDb().select().from(users).where(eq(users.id, id)).limit(1)
  const loggedInAt = typeof session.loggedInAt === 'number' ? session.loggedInAt : 0
  const passwordChangedLater =
    !!row?.passwordChangedAt && row.passwordChangedAt.getTime() > loggedInAt

  if (!row || !row.isActive || passwordChangedLater) {
    await clearUserSession(event)
    return null
  }
  return row
}

/** То же, но без входа — ответ 401. */
export async function requireAdminUser(event: H3Event): Promise<UserRow> {
  const user = await getAdminUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Нужно войти в админку' })
  return user
}

/** Проверка прав на раздел: «смотрит» или «правит». Без прав — 403. */
export async function requireAccess(
  event: H3Event,
  section: Section,
  needed: Exclude<AccessLevel, 'none'>,
): Promise<UserRow> {
  const user = await requireAdminUser(event)
  if (!allows(accessTo(user.role, user.permissions, section), needed)) {
    throw createError({ statusCode: 403, message: 'Нет доступа к разделу' })
  }
  return user
}
