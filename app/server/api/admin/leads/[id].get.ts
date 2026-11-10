// Карточка лида: GET /api/admin/leads/:id — контакт, события, согласия, возможные дубли
import type { AdminLead } from '#shared/leads'

export default defineEventHandler(async (event): Promise<AdminLead> => {
  await requireAccess(event, 'leads', 'view')
  return await loadLead(idParam(event))
})
