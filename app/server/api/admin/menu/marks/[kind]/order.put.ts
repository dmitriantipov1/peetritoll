// Порядок отметок справочника: PUT /api/admin/menu/marks/diet|labels/order { ids }
import { orderInputSchema } from '#shared/menu'

export default defineEventHandler(async (event) => {
  await requireAccess(event, 'menu', 'edit')
  const kind = markKindParam(event)
  const { ids } = await readBodyWith(event, orderInputSchema)
  await orderMarks(kind, ids)
  return { ok: true }
})
