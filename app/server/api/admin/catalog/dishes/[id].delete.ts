// Удалить блюдо каталога: DELETE /api/admin/catalog/dishes/:id
export default defineEventHandler(async (event) => {
  await requireAccess(event, 'menu', 'edit')
  const id = idParam(event)
  await dishKind(id) // нет блюда — 404
  await deleteCatalogDish(id)
  return { ok: true }
})
