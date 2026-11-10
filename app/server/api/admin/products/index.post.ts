// Новый товар: POST /api/admin/products → { id }. Сразу целиком: переводы, фото, варианты
import { productInputSchema } from '#shared/shop'

export default defineEventHandler(async (event) => {
  const user = await requireAccess(event, 'products', 'edit')
  const input = await readBodyWith(event, productInputSchema)
  return { id: await saveProduct(null, input, user.id) }
})
