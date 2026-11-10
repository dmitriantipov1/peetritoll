// Где показывать товар (8.5): PATCH /api/admin/products/:id/locales { locales } — клик по языку в списке
import { productLocalesSchema } from '#shared/shop'

export default defineEventHandler(async (event) => {
  const user = await requireAccess(event, 'products', 'edit')
  const { locales } = await readBodyWith(event, productLocalesSchema)
  await setProductLocales(idParam(event), locales, user.id)
  return { ok: true }
})
