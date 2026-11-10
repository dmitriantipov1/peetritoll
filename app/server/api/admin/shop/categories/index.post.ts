// Новая категория магазина: POST /api/admin/shop/categories { names, isVisible } → { id }
import { shopCategoryInputSchema } from '#shared/shop'

export default defineEventHandler(async (event) => {
  await requireAccess(event, 'products', 'edit')
  const { names, isVisible } = await readBodyWith(event, shopCategoryInputSchema)
  return { id: await createShopCategory(names, isVisible) }
})
