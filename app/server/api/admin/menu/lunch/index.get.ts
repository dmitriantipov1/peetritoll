// Неделя дневного меню: GET /api/admin/menu/lunch?week=2026-11-09 (любой день недели)
export default defineEventHandler(async (event) => {
  await requireAccess(event, 'menu.lunch', 'view')
  return await loadLunchWeek(weekParam(getQuery(event).week))
})
