// Новая отметка: POST /api/admin/menu/marks/diet|labels { names } → { id }
import { markInputSchema } from '#shared/menu'

export default defineEventHandler(async (event) => {
  await requireAccess(event, 'menu', 'edit')
  const kind = markKindParam(event)
  const input = await readBodyWith(event, markInputSchema)
  return { id: await createMark(kind, input) }
})
