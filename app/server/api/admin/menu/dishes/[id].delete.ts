// Удалить блюдо: DELETE /api/admin/menu/dishes/:id
export default defineEventHandler(async (event) => {
  await requireAccess(event, 'menu', 'edit')
  await deleteDish(dishIdParam(event))
  return { ok: true }
})
