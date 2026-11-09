// Выдать ссылку «задать пароль»: POST /api/admin/staff/:id/password-link → { url, kind, expiresAt }.
// Нет пароля — приглашение; есть — новый пароль, прежний сразу перестаёт действовать.
// Ссылка в ответе — единственный раз, когда её видно: в базе только хэш.
import type { IssuedPasswordLink } from '#shared/staff'

export default defineEventHandler(async (event): Promise<IssuedPasswordLink> => {
  const actor = await requireAccess(event, 'staff', 'edit')
  return await issuePasswordLink(event, actor, idParam(event))
})
