// Сохранить карточку заявки: PUT /api/admin/requests/:id { поля…, status, note } → карточка.
// Нужно право «правит» на раздел заявок этого вида
import { requests } from '../../../db/schema'
import { eq } from 'drizzle-orm'
import { requestSaveSchema, type AdminRequest } from '#shared/requests'

export default defineEventHandler(async (event): Promise<AdminRequest> => {
  const user = await requireAdminUser(event)
  const id = idParam(event)
  const input = await readBodyWith(event, requestSaveSchema)
  const [row] = await useDb()
    .select({ type: requests.type })
    .from(requests)
    .where(eq(requests.id, id))
    .limit(1)
  if (!row) throw createError({ statusCode: 404, message: 'Заявка не найдена' })
  requireRequestAccess(user, row.type, 'edit')
  await saveRequest(id, input, user.id)
  return await loadRequest(id, user)
})
