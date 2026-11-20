// Порядок программ на сайте: PUT /api/admin/tours/order { ids }
import { orderInputSchema } from '#shared/menu'

export default defineEventHandler(async (event) => {
  await requireAccess(event, 'tours', 'edit')
  const { ids } = await readBodyWith(event, orderInputSchema)
  await orderTours(ids)
  return { ok: true }
})
