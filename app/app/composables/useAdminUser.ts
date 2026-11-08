// Кто вошёл в админку и что ему можно — в браузере.
// Права здесь только для удобства (меню, кнопки): настоящая проверка — на сервере.
import { accessTo, allows, canSeeAny, type AccessLevel, type Section } from '#shared/access'
import type { AdminUser } from '#shared/admin-user'

export function useAdminUser() {
  const user = useState<AdminUser | null>('admin-user', () => null)
  // useRequestFetch передаёт cookie браузера, когда страница собирается на сервере
  const requestFetch = useRequestFetch()

  /** Перечитать сотрудника с сервера. Без входа — null. */
  async function refresh() {
    try {
      user.value = await requestFetch<AdminUser>('/api/auth/me')
    } catch {
      user.value = null
    }
    return user.value
  }

  function can(section: Section, needed: Exclude<AccessLevel, 'none'> = 'view') {
    return (
      !!user.value && allows(accessTo(user.value.role, user.value.permissions, section), needed)
    )
  }

  function canAny(list: readonly Section[]) {
    return !!user.value && canSeeAny(user.value.role, user.value.permissions, list)
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' })
    user.value = null
    await navigateTo('/admin/login')
  }

  return { user, refresh, can, canAny, logout }
}
