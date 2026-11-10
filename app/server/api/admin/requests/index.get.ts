// Список заявок: GET /api/admin/requests — только видов, к которым у сотрудника есть доступ
import type { AdminRequestRow } from '#shared/requests'

export default defineEventHandler(async (event): Promise<AdminRequestRow[]> => {
  return await loadRequestList(await requireAdminUser(event))
})
