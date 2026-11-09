// Карточка сотрудника: GET /api/admin/staff/:id
import type { AdminStaff } from '#shared/staff'

export default defineEventHandler(async (event): Promise<AdminStaff> => {
  await requireAccess(event, 'staff', 'view')
  return await loadStaff(idParam(event))
})
