// Переименовать или скрыть категорию: PUT /api/admin/shop/categories/:id { names, isVisible }
import { shopCategoryInputSchema } from '#shared/shop'

export default defineEventHandler(async (event) => {
  await requireAccess(event, 'products', 'edit')
  const { names, isVisible } = await readBodyWith(event, shopCategoryInputSchema)
  await updateShopCategory(idParam(event), names, isVisible)
  return { ok: true }
})
