// Новое блюдо: POST /api/admin/menu/dishes → { id }
import { dishInputSchema } from '#shared/menu'

export default defineEventHandler(async (event) => {
  const user = await requireAccess(event, 'menu', 'edit')
  const input = await readBodyWith(event, dishInputSchema)
  return { id: await saveDish(null, input, user.id) }
})
