// Настройки калькулятора: PUT /api/admin/catalog/banquet|group/settings
import { banquetSettingsSchema, groupSettingsSchema } from '#shared/catalog'

export default defineEventHandler(async (event) => {
  const user = await requireAccess(event, 'menu', 'edit')
  const kind = catalogKindParam(event)
  const value =
    kind === 'banquet'
      ? await readBodyWith(event, banquetSettingsSchema)
      : await readBodyWith(event, groupSettingsSchema)
  return await saveCatalogSettings(kind, value, user.id)
})
