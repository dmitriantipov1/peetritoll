// Порядок категорий: PUT /api/admin/menu/categories/order { ids }
import { orderInputSchema } from '#shared/menu'

export default defineEventHandler(async (event) => {
  await requireAccess(event, 'menu', 'edit')
  const { ids } = await readBodyWith(event, orderInputSchema)
  await orderCategories(ids)
  return { ok: true }
})
