// Переименовать, показать или скрыть категорию: PUT /api/admin/menu/categories/:id
import { categoryInputSchema } from '#shared/menu'

export default defineEventHandler(async (event) => {
  await requireAccess(event, 'menu', 'edit')
  const input = await readBodyWith(event, categoryInputSchema)
  await updateCategory(idParam(event), input)
  return { ok: true }
})
