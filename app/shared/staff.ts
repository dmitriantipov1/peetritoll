// Сотрудники админки (5.2): что видит браузер и кто кого может менять.
// Общий файл: правила одни для сервера (проверка запросов) и для экранов (что показывать).
// Роли и разделы — shared/access.ts.
import { z } from 'zod'
import {
  accessLevels,
  roleKeys,
  sectionKeys,
  type Permissions,
  type Role,
  type Section,
} from './access'

/** Строка списка «Сотрудники» */
export interface AdminStaffRow {
  id: number
  name: string
  email: string
  role: Role
  permissions: Permissions
  isActive: boolean
  /** Задан ли пароль. Нет — сотрудник ещё не вошёл ни разу по ссылке-приглашению */
  hasPassword: boolean
  lastLoginAt: string | null
  createdAt: string
}

/** Карточка сотрудника */
export interface AdminStaff extends AdminStaffRow {
  passwordChangedAt: string | null
  /** Выданная и ещё действующая ссылка «задать пароль» — без самой ссылки, её видно один раз */
  passwordLink: { kind: PasswordLinkKind; createdAt: string; expiresAt: string } | null
}

// ---------- Ссылки «задать пароль» (5.2) ----------

/** invite — первый пароль нового сотрудника, reset — новый вместо прежнего */
export type PasswordLinkKind = 'invite' | 'reset'

/** Сколько живёт ссылка. Почты пока нет, ссылку передают сами — поэтому не час, как в письме */
export const passwordLinkHours: Record<PasswordLinkKind, number> = {
  invite: 24 * 7,
  reset: 24,
}

/** Ответ на «выдать ссылку»: сама ссылка — только здесь, в базе её нет */
export interface IssuedPasswordLink {
  url: string
  kind: PasswordLinkKind
  expiresAt: string
}

/** Что видит человек, открывший ссылку */
export interface PasswordLinkInfo {
  name: string
  email: string
  kind: PasswordLinkKind
}

export const setPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  password: z.string(),
})

/** Статус в списке и карточке */
export function staffStatus(s: AdminStaffRow): { label: string; cls: string } {
  if (!s.isActive) return { label: 'Отключён', cls: 'adm-status--archive' }
  if (!s.hasPassword) {
    // Ни разу не входил — приглашён; входил, а пароля нет — пароль сброшен ссылкой
    return s.lastLoginAt
      ? { label: 'Ждёт новый пароль', cls: 'adm-status--planned' }
      : { label: 'Приглашён', cls: 'adm-status--planned' }
  }
  return { label: 'Активен', cls: 'adm-status--done' }
}

/**
 * Может ли actor менять учётную запись с ролью target (решение 08.11.2026, 5.2):
 * админ — всех; владелец — только сотрудников (админа не отключит и не понизит,
 * других владельцев не трогает); сотрудник — никого.
 */
export function canManage(actor: Role, target: Role): boolean {
  if (actor === 'admin') return true
  if (actor === 'owner') return target === 'staff'
  return false
}

/** Какие роли actor может выдать */
export function assignableRoles(actor: Role): Role[] {
  if (actor === 'admin') return [...roleKeys]
  if (actor === 'owner') return ['staff']
  return []
}

/**
 * Права в том виде, в каком их хранят: только у сотрудника, без «нет доступа»
 * (чего нет — того нет) и без раздела «Сотрудники» — его сотруднику не выдают.
 */
export function cleanPermissions(role: Role, permissions: Permissions): Permissions {
  if (role !== 'staff') return {}
  const result: Permissions = {}
  for (const section of sectionKeys) {
    const level = permissions[section]
    if (section !== 'staff' && level && level !== 'none') result[section] = level
  }
  return result
}

export const staffInputSchema = z.object({
  name: z.string().trim().min(1, 'Укажите имя').max(100, 'Имя слишком длинное'),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email('Проверьте e-mail'))
    .pipe(z.string().max(200, 'E-mail слишком длинный')),
  role: z.enum(roleKeys as [Role, ...Role[]], 'Выберите роль'),
  permissions: z.partialRecord(
    z.enum(sectionKeys as [Section, ...Section[]]),
    z.enum(accessLevels),
  ),
  isActive: z.boolean(),
})

export type StaffInput = z.infer<typeof staffInputSchema>
