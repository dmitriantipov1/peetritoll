// Порядок категорий галереи: PUT /api/admin/gallery/categories/order { ids }
import { orderInputSchema } from '#shared/gallery'

export default defineEventHandler(async (event) => {
  await requireAccess(event, 'gallery', 'edit')
  const { ids } = await readBodyWith(event, orderInputSchema)
  await orderGalleryCategories(ids)
  return { ok: true }
})
