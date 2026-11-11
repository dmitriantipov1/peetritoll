// Групповое меню — «Трапезы групп» с настройками: GET /api/admin/group-menus
export default defineEventHandler(async (event) => {
  await requireAccess(event, 'menu', 'view')
  return await loadGroupMenus()
})
