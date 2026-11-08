// Новая категория каталога: POST /api/admin/catalog/banquet|group/categories { names } → { id }
import { catalogCategoryInputSchema } from '#shared/catalog'

export default defineEventHandler(async (event) => {
  await requireAccess(event, 'menu', 'edit')
  const kind = catalogKindParam(event)
  const { names } = await readBodyWith(event, catalogCategoryInputSchema)
  return { id: await createCatalogCategory(kind, names) }
})
