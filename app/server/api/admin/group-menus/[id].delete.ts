// Удалить обед для групп: DELETE /api/admin/group-menus/:id (заявки хранят его снимком)
export default defineEventHandler(async (event) => {
  await requireAccess(event, 'menu', 'edit')
  await deleteGroupMenu(idParam(event))
  return { ok: true }
})
