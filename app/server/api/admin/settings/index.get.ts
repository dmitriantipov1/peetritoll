// Настройки сайта: GET /api/admin/settings
export default defineEventHandler(async (event) => {
  await requireAccess(event, 'settings', 'view')
  return await loadSiteSettings()
})
