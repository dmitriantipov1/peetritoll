// «На сайте»: PATCH /api/admin/group-menus/:id/visibility { isVisible }
import { z } from 'zod'

const bodySchema = z.object({ isVisible: z.boolean() })

export default defineEventHandler(async (event) => {
  const user = await requireAccess(event, 'menu', 'edit')
  const { isVisible } = await readBodyWith(event, bodySchema)
  await setGroupMenuVisibility(idParam(event), isVisible, user.id)
  return { ok: true }
})
