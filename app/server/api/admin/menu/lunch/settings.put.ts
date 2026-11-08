// Настройки дневного меню: PUT /api/admin/menu/lunch/settings
import { lunchSettingsSchema } from '#shared/lunch'

export default defineEventHandler(async (event) => {
  const user = await requireAccess(event, 'menu.lunch', 'edit')
  const settings = await readBodyWith(event, lunchSettingsSchema)
  await writeSetting(LUNCH_SETTINGS_KEY, settings, user.id)
  return settings
})
