// Экскурсионные программы для админки: GET /api/admin/tours
export default defineEventHandler(async (event) => {
  await requireAccess(event, 'tours', 'view')
  return await loadTours()
})
