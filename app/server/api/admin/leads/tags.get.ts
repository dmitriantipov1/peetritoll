// Теги лидов с числом контактов: GET /api/admin/leads/tags — подсказка при вводе и фильтр
import type { LeadTagCount } from '#shared/leads'

export default defineEventHandler(async (event): Promise<LeadTagCount[]> => {
  await requireAccess(event, 'leads', 'view')
  return await loadLeadTags()
})
