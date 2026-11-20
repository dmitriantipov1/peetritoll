// «На сайте»: PATCH /api/admin/tours/:id/visibility { isVisible }
import { z } from 'zod'

const bodySchema = z.object({ isVisible: z.boolean() })

export default defineEventHandler(async (event) => {
  const user = await requireAccess(event, 'tours', 'edit')
  const { isVisible } = await readBodyWith(event, bodySchema)
  await setTourVisibility(idParam(event), isVisible, user.id)
  return { ok: true }
})
