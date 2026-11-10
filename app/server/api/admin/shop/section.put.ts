// Раздел «Магазин» на сайте — переключатель над списком товаров: PUT /api/admin/shop/section
// { enabled }. Тот же выключатель — в «Настройках сайта»; хранится в sections.shop
import { z } from 'zod'

const bodySchema = z.object({ enabled: z.boolean() })

export default defineEventHandler(async (event) => {
  const user = await requireAccess(event, 'products', 'edit')
  const { enabled } = await readBodyWith(event, bodySchema)
  await setSectionEnabled('shop', enabled, user.id)
  return { ok: true }
})
