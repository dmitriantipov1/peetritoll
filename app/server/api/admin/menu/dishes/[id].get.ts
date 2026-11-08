// Блюдо для карточки: GET /api/admin/menu/dishes/:id
export default defineEventHandler(async (event) => {
  await requireAccess(event, 'menu', 'view')
  return await loadAdminDish(dishIdParam(event))
})
