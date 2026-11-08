// Сохранить блюдо каталога: PUT /api/admin/catalog/dishes/:id
import { catalogDishInputSchema } from '#shared/catalog'

export default defineEventHandler(async (event) => {
  const user = await requireAccess(event, 'menu', 'edit')
  const id = idParam(event)
  const input = await readBodyWith(event, catalogDishInputSchema)
  // Перенести блюдо можно только в категорию своего же меню (банкетное ↔ групповое — нельзя)
  await saveCatalogDish(await dishKind(id), id, input, user.id)
  return { ok: true }
})
