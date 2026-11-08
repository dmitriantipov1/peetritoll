// Новый материал: POST /api/admin/materials → { id }
import { materialInputSchema } from '#shared/materials'

export default defineEventHandler(async (event) => {
  const user = await requireAccess(event, 'materials', 'edit')
  const input = await readBodyWith(event, materialInputSchema)
  return { id: await saveMaterial(null, input, user.id) }
})
