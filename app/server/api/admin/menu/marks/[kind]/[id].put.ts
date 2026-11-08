// Переименовать отметку: PUT /api/admin/menu/marks/diet|labels/:id { names }
import { markInputSchema } from '#shared/menu'

export default defineEventHandler(async (event) => {
  await requireAccess(event, 'menu', 'edit')
  const kind = markKindParam(event)
  const input = await readBodyWith(event, markInputSchema)
  await updateMark(kind, idParam(event), input)
  return { ok: true }
})
