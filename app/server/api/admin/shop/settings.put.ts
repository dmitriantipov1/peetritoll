// Настройки магазина: PUT /api/admin/shop/settings { deliveryEstoniaCents, deliveryEuCents }
import { shopSettingsSchema } from '#shared/shop'

export default defineEventHandler(async (event) => {
  const user = await requireAccess(event, 'products', 'edit')
  const settings = await readBodyWith(event, shopSettingsSchema)
  await writeSetting('shop', settings, user.id)
  return settings
})
