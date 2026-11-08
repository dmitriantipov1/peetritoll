// Настройки дневного меню: PUT /api/admin/menu/lunch/settings
import { lunchSettingsSchema } from '#shared/lunch'

export default defineEventHandler(async (event) => {
  const user = await requireAccess(event, 'menu.lunch', 'edit')
  const settings = await readBodyWith(event, lunchSettingsSchema)
  return await saveLunchSettings(settings, user.id)
})
