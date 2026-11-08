// Показать или скрыть блюдо на сайте: PATCH /api/admin/menu/dishes/:id/visibility { isVisible }
import { z } from 'zod'

const bodySchema = z.object({ isVisible: z.boolean() })

export default defineEventHandler(async (event) => {
  const user = await requireAccess(event, 'menu', 'edit')
  const { isVisible } = await readBodyWith(event, bodySchema)
  await setDishVisibility(dishIdParam(event), isVisible, user.id)
  return { ok: true }
})
