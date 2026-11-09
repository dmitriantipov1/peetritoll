// Переименовать категорию галереи: PUT /api/admin/gallery/categories/:id { names }
import { galleryCategoryInputSchema } from '#shared/gallery'

export default defineEventHandler(async (event) => {
  await requireAccess(event, 'gallery', 'edit')
  const { names } = await readBodyWith(event, galleryCategoryInputSchema)
  await updateGalleryCategory(idParam(event), names)
  return { ok: true }
})
