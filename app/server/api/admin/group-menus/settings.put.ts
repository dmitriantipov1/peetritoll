// Настройки группового меню: PUT /api/admin/group-menus/settings { minPeople, leadHours }
import { groupSettingsSchema } from '#shared/group-menus'

export default defineEventHandler(async (event) => {
  const user = await requireAccess(event, 'menu', 'edit')
  const value = await readBodyWith(event, groupSettingsSchema)
  return await saveGroupSettings(value, user.id)
})
