// Подпись, категория, «на сайте»: PUT /api/admin/gallery/photos/:id
import { galleryPhotoInputSchema } from '#shared/gallery'

export default defineEventHandler(async (event) => {
  const user = await requireAccess(event, 'gallery', 'edit')
  const input = await readBodyWith(event, galleryPhotoInputSchema)
  await updateGalleryPhoto(idParam(event), input, user.id)
  return { ok: true }
})
