// Новое блюдо каталога: POST /api/admin/catalog/banquet/dishes → { id }
import { catalogDishInputSchema } from '#shared/catalog'

export default defineEventHandler(async (event) => {
  const user = await requireAccess(event, 'menu', 'edit')
  const kind = catalogKindParam(event)
  const input = await readBodyWith(event, catalogDishInputSchema)
  return { id: await saveCatalogDish(kind, null, input, user.id) }
})
