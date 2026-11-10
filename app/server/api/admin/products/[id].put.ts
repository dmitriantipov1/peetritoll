// Сохранить товар целиком: PUT /api/admin/products/:id → карточка
import { productInputSchema, type AdminProduct } from '#shared/shop'

export default defineEventHandler(async (event): Promise<AdminProduct> => {
  const user = await requireAccess(event, 'products', 'edit')
  const id = idParam(event)
  await saveProduct(id, await readBodyWith(event, productInputSchema), user.id)
  return await loadAdminProduct(id)
})
