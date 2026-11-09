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
