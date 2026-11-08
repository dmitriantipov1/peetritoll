// Удалить пустую категорию: DELETE /api/admin/menu/categories/:id (с блюдами — 409)
export default defineEventHandler(async (event) => {
  await requireAccess(event, 'menu', 'edit')
  await deleteCategory(idParam(event))
  return { ok: true }
})
