// Задать пароль по ссылке: POST /api/auth/password { token, password }.
// Ссылка гаснет, прежние сессии закрываются, человек сразу входит в админку (сессия на 12 часов)
import { setPasswordSchema } from '#shared/staff'

export default defineEventHandler(async (event) => {
  const { token, password } = await readBodyWith(event, setPasswordSchema)
  const user = await setPasswordByLink(token, password)
  await replaceUserSession(event, { user: { id: user.id }, loggedInAt: Date.now() })
  return toAdminUser(user)
})
