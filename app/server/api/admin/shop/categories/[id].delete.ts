// Удалить пустую категорию: DELETE /api/admin/shop/categories/:id. С товарами — 409
export default defineEventHandler(async (event) => {
  await requireAccess(event, 'products', 'edit')
  await deleteShopCategory(idParam(event))
  return { ok: true }
})
