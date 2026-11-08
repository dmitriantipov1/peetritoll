// Сохранить материал целиком: PUT /api/admin/materials/:id
import { materialInputSchema } from '#shared/materials'

export default defineEventHandler(async (event) => {
  const user = await requireAccess(event, 'materials', 'edit')
  const id = materialIdParam(event)
  const input = await readBodyWith(event, materialInputSchema)
  await saveMaterial(id, input, user.id)
  return await loadAdminMaterial(id)
})
