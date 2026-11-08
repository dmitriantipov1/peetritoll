// Удалить пустую категорию каталога: DELETE /api/admin/catalog/categories/:id (с блюдами — 409)
export default defineEventHandler(async (event) => {
  await requireAccess(event, 'menu', 'edit')
  await deleteCatalogCategory(idParam(event))
  return { ok: true }
})
