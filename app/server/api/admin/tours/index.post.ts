// Новая экскурсионная программа: POST /api/admin/tours → { id }
import { tourInputSchema } from '#shared/tours'

export default defineEventHandler(async (event) => {
  const user = await requireAccess(event, 'tours', 'edit')
  const input = await readBodyWith(event, tourInputSchema)
  return { id: await saveTour(null, input, user.id) }
})
