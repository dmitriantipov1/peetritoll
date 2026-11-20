// Удалить экскурсионную программу: DELETE /api/admin/tours/:id (заявки хранят её снимком)
export default defineEventHandler(async (event) => {
  await requireAccess(event, 'tours', 'edit')
  await deleteTour(idParam(event))
  return { ok: true }
})
