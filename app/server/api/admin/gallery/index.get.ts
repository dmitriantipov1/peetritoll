// Галерея целиком: GET /api/admin/gallery → { categories, photos }
export default defineEventHandler(async (event) => {
  await requireAccess(event, 'gallery', 'view')
  return await loadAdminGallery()
})
