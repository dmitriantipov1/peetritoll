// Ссылки «задать пароль» (5.2): приглашение и новый пароль. Доступно в серверном коде без импорта.
// В базе — только SHA-256 от случайной части ссылки; саму ссылку видит один раз тот, кто её выдал.
import { createHash, randomBytes } from 'node:crypto'
import type { H3Event } from 'h3'
import { and, eq, gt, isNull } from 'drizzle-orm'
import { passwordLinks, users, type UserRow } from '../db/schema'
import { roles } from '#shared/access'
import { passwordProblem } from '#shared/password'
import {
  canManage,
  passwordLinkHours,
  type AdminStaff,
  type IssuedPasswordLink,
  type PasswordLinkInfo,
  type PasswordLinkKind,
} from '#shared/staff'

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Действующая ссылка человека (для карточки): не использована и не истекла */
export async function activePasswordLink(userId: number): Promise<AdminStaff['passwordLink']> {
  const [row] = await useDb()
    .select()
    .from(passwordLinks)
    .where(
      and(
        eq(passwordLinks.userId, userId),
        isNull(passwordLinks.usedAt),
        gt(passwordLinks.expiresAt, new Date()),
      ),
    )
    .limit(1)
  if (!row) return null
  return {
    kind: row.kind,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
  }
}

/** Адрес сайта для ссылки: из настроек (NUXT_PUBLIC_I18N_BASE_URL), иначе — откуда пришёл запрос */
function siteOrigin(event: H3Event): string {
  const base = useRuntimeConfig(event).public.i18n?.baseUrl
  return (typeof base === 'string' && base ? base : getRequestURL(event).origin).replace(/\/$/, '')
}

/**
 * Выдать ссылку. Ни разу не входил — приглашение, иначе — новый пароль: прежний сразу
 * перестаёт действовать, все сессии человека закрываются (5.2). Прежние ссылки гаснут.
 */
export async function issuePasswordLink(
  event: H3Event,
  actor: UserRow,
  userId: number,
): Promise<IssuedPasswordLink> {
  const [target] = await useDb().select().from(users).where(eq(users.id, userId)).limit(1)
  if (!target) throw createError({ statusCode: 404, message: 'Сотрудник не найден' })
  if (target.id === actor.id) {
    throw createError({ statusCode: 403, message: 'Себе ссылку выдать нельзя' })
  }
  if (!canManage(actor.role, target.role)) {
    throw createError({
      statusCode: 403,
      message: `Ссылку для роли «${roles[target.role]}» может выдать только админ`,
    })
  }
  if (!target.isActive) {
    throw createError({ statusCode: 409, message: 'Доступ отключён — сначала верните его' })
  }

  // Приглашение — только тому, кто ещё ни разу не входил; вернувшемуся после сброса — «новый пароль»
  const kind: PasswordLinkKind = target.passwordHash || target.lastLoginAt ? 'reset' : 'invite'
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + passwordLinkHours[kind] * 60 * 60 * 1000)
  const now = new Date()

  await useDb().transaction(async (tx) => {
    await tx
      .update(passwordLinks)
      .set({ usedAt: now })
      .where(and(eq(passwordLinks.userId, target.id), isNull(passwordLinks.usedAt)))
    await tx.insert(passwordLinks).values({
      userId: target.id,
      tokenHash: hashToken(token),
      kind,
      expiresAt,
      createdBy: actor.id,
    })
    if (kind === 'reset') {
      await tx
        .update(users)
        .set({ passwordHash: null, passwordChangedAt: now })
        .where(eq(users.id, target.id))
    }
  })

  return {
    url: `${siteOrigin(event)}/admin/password?token=${token}`,
    kind,
    expiresAt: expiresAt.toISOString(),
  }
}

/** Ссылка и её владелец, если ссылка ещё действует. Иначе — 410 с понятным текстом */
async function findUsableLink(token: string) {
  const [found] = await useDb()
    .select({ link: passwordLinks, user: users })
    .from(passwordLinks)
    .innerJoin(users, eq(users.id, passwordLinks.userId))
    .where(eq(passwordLinks.tokenHash, hashToken(token)))
    .limit(1)
  const gone = (message: string) => createError({ statusCode: 410, message })
  if (!found) throw gone('Ссылка не найдена. Попросите выдать новую.')
  if (found.link.usedAt)
    throw gone('Ссылка уже использована или заменена новой. Попросите выдать новую.')
  if (found.link.expiresAt <= new Date()) throw gone('Срок ссылки истёк. Попросите выдать новую.')
  if (!found.user.isActive) throw gone('Доступ отключён.')
  return found
}

export async function passwordLinkInfo(token: string): Promise<PasswordLinkInfo> {
  const { link, user } = await findUsableLink(token)
  return { name: user.name, email: user.email, kind: link.kind }
}

/** Задать пароль по ссылке. Ссылка гаснет, прежние сессии закрываются. Возвращает человека */
export async function setPasswordByLink(token: string, password: string): Promise<UserRow> {
  const problem = passwordProblem(password)
  if (problem) {
    throw createError({
      statusCode: 400,
      message: problem,
      data: { issues: [{ path: 'password', message: problem }] },
    })
  }
  const { link, user } = await findUsableLink(token)
  const passwordHash = await hashPassword(password)
  const now = new Date()

  return await useDb().transaction(async (tx) => {
    // Гасим ссылку условием «ещё не использована»: два одновременных запроса не пройдут оба
    const [used] = await tx
      .update(passwordLinks)
      .set({ usedAt: now })
      .where(and(eq(passwordLinks.id, link.id), isNull(passwordLinks.usedAt)))
      .returning({ id: passwordLinks.id })
    if (!used) {
      throw createError({
        statusCode: 410,
        message: 'Ссылка уже использована. Попросите выдать новую.',
      })
    }
    const [updated] = await tx
      .update(users)
      .set({ passwordHash, passwordChangedAt: now, lastLoginAt: now })
      .where(eq(users.id, user.id))
      .returning()
    return updated!
  })
}
