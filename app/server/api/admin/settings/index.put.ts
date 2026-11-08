// Сохранить настройки сайта: PUT /api/admin/settings { sections, notifications, events }
import { siteSettingsInputSchema } from '#shared/site-settings'

export default defineEventHandler(async (event) => {
  const user = await requireAccess(event, 'settings', 'edit')
  const input = await readBodyWith(event, siteSettingsInputSchema)
  return await saveSiteSettings(input, user.id)
})
