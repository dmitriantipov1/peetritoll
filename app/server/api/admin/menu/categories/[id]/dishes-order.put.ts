// Порядок блюд в категории: PUT /api/admin/menu/categories/:id/dishes-order { ids }
import { orderInputSchema } from '#shared/menu'

export default defineEventHandler(async (event) => {
  await requireAccess(event, 'menu', 'edit')
  const { ids } = await readBodyWith(event, orderInputSchema)
  await orderDishes(idParam(event), ids)
  return { ok: true }
})
