// Удалить отметку (снимается со всех блюд): DELETE /api/admin/menu/marks/diet|labels/:id
export default defineEventHandler(async (event) => {
  await requireAccess(event, 'menu', 'edit')
  await deleteMark(markKindParam(event), idParam(event))
  return { ok: true }
})
