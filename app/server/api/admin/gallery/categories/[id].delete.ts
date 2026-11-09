// Удалить пустую категорию галереи: DELETE /api/admin/gallery/categories/:id (с фото — 409)
export default defineEventHandler(async (event) => {
  await requireAccess(event, 'gallery', 'edit')
  await deleteGalleryCategory(idParam(event))
  return { ok: true }
})
