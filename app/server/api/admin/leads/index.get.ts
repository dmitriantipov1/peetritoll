// Лиды: GET /api/admin/leads — все контакты, сначала с последним обращением
import type { AdminLeadRow } from '#shared/leads'

export default defineEventHandler(async (event): Promise<AdminLeadRow[]> => {
  await requireAccess(event, 'leads', 'view')
  return await loadLeadList()
})
