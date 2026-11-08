// Переименовать категорию каталога: PUT /api/admin/catalog/categories/:id { names }
import { catalogCategoryInputSchema } from '#shared/catalog'

export default defineEventHandler(async (event) => {
  await requireAccess(event, 'menu', 'edit')
  const { names } = await readBodyWith(event, catalogCategoryInputSchema)
  await renameCatalogCategory(idParam(event), names)
  return { ok: true }
})
