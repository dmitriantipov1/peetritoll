// Новая категория галереи: POST /api/admin/gallery/categories { names } → { id }
import { galleryCategoryInputSchema } from '#shared/gallery'

export default defineEventHandler(async (event) => {
  await requireAccess(event, 'gallery', 'edit')
  const { names } = await readBodyWith(event, galleryCategoryInputSchema)
  return { id: await createGalleryCategory(names) }
})
