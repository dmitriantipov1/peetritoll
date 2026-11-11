// Настройки калькулятора: PUT /api/admin/catalog/banquet/settings
import { banquetSettingsSchema } from '#shared/catalog'

export default defineEventHandler(async (event) => {
  const user = await requireAccess(event, 'menu', 'edit')
  const kind = catalogKindParam(event)
  const value = await readBodyWith(event, banquetSettingsSchema)
  return await saveCatalogSettings(kind, value, user.id)
})
