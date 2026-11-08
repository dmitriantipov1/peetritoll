// Основное меню для списка в админке: GET /api/admin/menu
export default defineEventHandler(async (event) => {
  await requireAccess(event, 'menu', 'view')
  return await loadAdminMenu()
})
