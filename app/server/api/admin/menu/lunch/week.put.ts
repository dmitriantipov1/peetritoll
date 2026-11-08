// Сохранить неделю дневного меню: PUT /api/admin/menu/lunch/week { monday, days }
import { lunchWeekInputSchema } from '#shared/lunch'

export default defineEventHandler(async (event) => {
  const user = await requireAccess(event, 'menu.lunch', 'edit')
  const input = await readBodyWith(event, lunchWeekInputSchema)
  const monday = weekParam(input.monday)
  await saveLunchWeek({ ...input, monday }, user.id)
  return await loadLunchWeek(monday)
})
