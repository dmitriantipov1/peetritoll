// Сохранить лид: PUT /api/admin/leads/:id { name, email, phone, locale, tags, marketingOff? }
import { leadInputSchema, type AdminLead } from '#shared/leads'

export default defineEventHandler(async (event): Promise<AdminLead> => {
  await requireAccess(event, 'leads', 'edit')
  const id = idParam(event)
  await saveLead(id, await readBodyWith(event, leadInputSchema))
  return await loadLead(id)
})
