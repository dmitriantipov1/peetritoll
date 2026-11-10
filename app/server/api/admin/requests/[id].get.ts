// Карточка заявки: GET /api/admin/requests/:id — с историей и ценами каталога сейчас
import type { AdminRequest } from '#shared/requests'

export default defineEventHandler(async (event): Promise<AdminRequest> => {
  return await loadRequest(idParam(event), await requireAdminUser(event))
})
