// Открыли ссылку «задать пароль»: GET /api/auth/password-link?token=… → { name, email, kind }.
// Без входа: ссылка сама по себе пропуск. Недействующая — 410 с понятным текстом
import type { PasswordLinkInfo } from '#shared/staff'

export default defineEventHandler(async (event): Promise<PasswordLinkInfo> => {
  const token = getQuery(event).token
  if (typeof token !== 'string' || !token) {
    throw createError({ statusCode: 400, message: 'В ссылке нет ключа' })
  }
  return await passwordLinkInfo(token)
})
