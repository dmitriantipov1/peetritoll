// Сотрудник, каким его видит браузер: без пароля и служебных полей.
import type { Permissions, Role } from './access'

export interface AdminUser {
  id: number
  email: string
  name: string
  role: Role
  permissions: Permissions
}
