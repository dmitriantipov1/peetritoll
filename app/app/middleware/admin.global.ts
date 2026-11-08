// Защита страниц админки: без входа — на страницу входа, без прав на раздел — 403.
// Это удобство для браузера; данные защищает сервер (server/utils/auth.ts).
import { firstAllowedPath } from '~/utils/admin-nav'

const LOGIN = '/admin/login'

export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path !== '/admin' && !to.path.startsWith('/admin/')) return

  const { user, refresh, canAny } = useAdminUser()
  // Сотрудник уже известен — не спрашиваем сервер на каждом переходе внутри админки
  if (!user.value) await refresh()

  if (to.path === LOGIN) {
    // Уже вошёл — на страницу входа незачем
    return user.value ? navigateTo(firstAllowedPath(canAny)) : undefined
  }

  if (!user.value) {
    return navigateTo({ path: LOGIN, query: { next: to.fullPath } })
  }

  const access = to.meta.access
  if (access && !canAny(access)) {
    // Главная админки — список заявок; у кого к ним нет доступа, ведём в первый доступный раздел
    if (to.path === '/admin') {
      const target = firstAllowedPath(canAny)
      if (target !== '/admin') return navigateTo(target)
    }
    throw createError({ statusCode: 403, message: 'Нет доступа к разделу', fatal: true })
  }
})
