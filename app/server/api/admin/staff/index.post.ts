// Новый сотрудник: POST /api/admin/staff → { id }. Пароль он задаст сам по ссылке-приглашению
import { staffInputSchema } from '#shared/staff'

export default defineEventHandler(async (event) => {
  const actor = await requireAccess(event, 'staff', 'edit')
  const input = await readBodyWith(event, staffInputSchema)
  return { id: await createStaff(actor, input) }
})
