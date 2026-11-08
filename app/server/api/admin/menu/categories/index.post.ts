// Новая категория меню: POST /api/admin/menu/categories { names, isVisible } → { id }
import { categoryInputSchema } from '#shared/menu'

export default defineEventHandler(async (event) => {
  await requireAccess(event, 'menu', 'edit')
  const input = await readBodyWith(event, categoryInputSchema)
  return { id: await createCategory(input) }
})
