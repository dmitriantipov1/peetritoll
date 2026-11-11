// Каталог банкетного меню с сетами и настройками: GET /api/admin/catalog/banquet
export default defineEventHandler(async (event) => {
  await requireAccess(event, 'menu', 'view')
  return await loadCatalog(catalogKindParam(event))
})
