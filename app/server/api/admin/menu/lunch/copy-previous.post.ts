// Скопировать прошлую неделю в пустые дни этой: POST /api/admin/menu/lunch/copy-previous { monday }
import { z } from 'zod'

const bodySchema = z.object({ monday: z.string() })

export default defineEventHandler(async (event) => {
  const user = await requireAccess(event, 'menu.lunch', 'edit')
  const monday = weekParam((await readBodyWith(event, bodySchema)).monday)
  const copied = await copyPreviousLunchWeek(monday, user.id)
  return { copied, week: await loadLunchWeek(monday) }
})
