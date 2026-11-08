// Каталог банкетного или группового меню с настройками: GET /api/admin/catalog/banquet|group
export default defineEventHandler(async (event) => {
  await requireAccess(event, 'menu', 'view')
  return await loadCatalog(catalogKindParam(event))
})
