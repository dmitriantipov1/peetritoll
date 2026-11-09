// Добавить загруженную картинку в галерею: POST /api/admin/gallery/photos { mediaId, categoryId }
import { galleryPhotoCreateSchema } from '#shared/gallery'

export default defineEventHandler(async (event) => {
  const user = await requireAccess(event, 'gallery', 'edit')
  const { mediaId, categoryId } = await readBodyWith(event, galleryPhotoCreateSchema)
  return { id: await addGalleryPhoto(mediaId, categoryId, user.id) }
})
