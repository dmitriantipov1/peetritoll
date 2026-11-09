// Порядок фото — весь список галереи: PUT /api/admin/gallery/photos/order { ids }
import { orderInputSchema } from '#shared/gallery'

export default defineEventHandler(async (event) => {
  await requireAccess(event, 'gallery', 'edit')
  const { ids } = await readBodyWith(event, orderInputSchema)
  await orderGalleryPhotos(ids)
  return { ok: true }
})
