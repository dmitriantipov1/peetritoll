// Сотрудники (5.2): список, карточка, создание и правка с проверкой «кто кого может менять».
// Доступно в серверном коде без импорта. Правила — shared/staff.ts.
import { asc, eq } from 'drizzle-orm'
import { users, type UserRow } from '../db/schema'
import { roles } from '#shared/access'
import {
  assignableRoles,
  canManage,
  cleanPermissions,
  type AdminStaff,
  type AdminStaffRow,
  type StaffInput,
} from '#shared/staff'

function toStaffRow(row: UserRow): AdminStaffRow {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    permissions: row.permissions,
    isActive: row.isActive,
    hasPassword: !!row.passwordHash,
    lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  }
}

/** Все учётные записи: сначала действующие, внутри — админы, владельцы, сотрудники, по имени */
export async function loadStaffList(): Promise<AdminStaffRow[]> {
  const rows = await useDb().select().from(users).orderBy(asc(users.name))
  const roleOrder = Object.keys(roles)
  return rows
    .map(toStaffRow)
    .sort(
      (a, b) =>
        Number(b.isActive) - Number(a.isActive) ||
        roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role),
    )
}

async function findUser(id: number): Promise<UserRow> {
  const [row] = await useDb().select().from(users).where(eq(users.id, id)).limit(1)
  if (!row) throw createError({ statusCode: 404, message: 'Сотрудник не найден' })
  return row
}

export async function loadStaff(id: number): Promise<AdminStaff> {
  const row = await findUser(id)
  return {
    ...toStaffRow(row),
    passwordChangedAt: row.passwordChangedAt?.toISOString() ?? null,
    passwordLink: await activePasswordLink(row.id),
  }
}

function forbid(message: string): never {
  throw createError({ statusCode: 403, message })
}

/** Почта занята — понятная ошибка вместо падения на уникальном индексе */
async function ensureEmailFree(email: string, exceptId?: number) {
  const [row] = await useDb()
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
  if (row && row.id !== exceptId) {
    throw createError({
      statusCode: 409,
      message: `Почта ${email} уже занята`,
      data: { issues: [{ path: 'email', message: 'Эта почта уже занята' }] },
    })
  }
}

/**
 * Новый сотрудник. Без пароля: войти он сможет, когда задаст пароль по ссылке-приглашению
 * (server/utils/password-links.ts). До тех пор в списке он «Приглашён».
 */
export async function createStaff(actor: UserRow, input: StaffInput): Promise<number> {
  if (!assignableRoles(actor.role).includes(input.role)) {
    forbid(`Роль «${roles[input.role]}» может выдать только админ`)
  }
  await ensureEmailFree(input.email)
  const [created] = await useDb()
    .insert(users)
    .values({
      name: input.name,
      email: input.email,
      role: input.role,
      permissions: cleanPermissions(input.role, input.permissions),
      isActive: input.isActive,
    })
    .returning({ id: users.id })
  return created!.id
}

/**
 * Сохранить карточку. Отключение и смена прав действуют сразу: права читаются
 * из базы на каждом запросе (server/utils/auth.ts), отключённого выкидывает.
 */
export async function updateStaff(actor: UserRow, id: number, input: StaffInput) {
  const target = await findUser(id)
  const self = target.id === actor.id

  if (self) {
    // Себя не понизить и не отключить — иначе можно случайно остаться без доступа
    if (input.role !== target.role) forbid('Свою роль поменять нельзя')
    if (!input.isActive) forbid('Себя отключить нельзя')
    // Остальное (имя, почту) себе поправить можно — и владельцу, хотя других владельцев он не трогает
  } else {
    if (!canManage(actor.role, target.role)) {
      forbid(`Учётную запись с ролью «${roles[target.role]}» может менять только админ`)
    }
    if (!assignableRoles(actor.role).includes(input.role)) {
      forbid(`Роль «${roles[input.role]}» может выдать только админ`)
    }
  }

  await ensureEmailFree(input.email, id)
  await useDb()
    .update(users)
    .set({
      name: input.name,
      email: input.email,
      role: input.role,
      permissions: cleanPermissions(input.role, input.permissions),
      isActive: input.isActive,
    })
    .where(eq(users.id, id))
}
