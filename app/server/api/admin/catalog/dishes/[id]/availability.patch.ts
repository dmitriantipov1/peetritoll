// «Можно заказать»: PATCH /api/admin/catalog/dishes/:id/availability { isAvailable }
import { z } from 'zod'

const bodySchema = z.object({ isAvailable: z.boolean() })

export default defineEventHandler(async (event) => {
  const user = await requireAccess(event, 'menu', 'edit')
  const id = idParam(event)
  await dishKind(id)
  const { isAvailable } = await readBodyWith(event, bodySchema)
  await setCatalogDishAvailability(id, isAvailable, user.id)
  return { ok: true }
})
