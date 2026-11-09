// Список сотрудников: GET /api/admin/staff
import type { AdminStaffRow } from '#shared/staff'

export default defineEventHandler(async (event): Promise<AdminStaffRow[]> => {
  await requireAccess(event, 'staff', 'view')
  return await loadStaffList()
})
