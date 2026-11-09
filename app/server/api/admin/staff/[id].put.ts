// Сохранить сотрудника: PUT /api/admin/staff/:id. Кто кого может менять — server/utils/staff.ts
import { staffInputSchema, type AdminStaff } from '#shared/staff'

export default defineEventHandler(async (event): Promise<AdminStaff> => {
  const actor = await requireAccess(event, 'staff', 'edit')
  const id = idParam(event)
  const input = await readBodyWith(event, staffInputSchema)
  await updateStaff(actor, id, input)
  return await loadStaff(id)
})
