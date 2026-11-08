// Сохранить блюдо целиком: PUT /api/admin/menu/dishes/:id
import { dishInputSchema } from '#shared/menu'

export default defineEventHandler(async (event) => {
  const user = await requireAccess(event, 'menu', 'edit')
  const id = dishIdParam(event)
  const input = await readBodyWith(event, dishInputSchema)
  await saveDish(id, input, user.id)
  return await loadAdminDish(id)
})
