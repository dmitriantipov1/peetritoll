// Убрать фото из галереи: DELETE /api/admin/gallery/photos/:id
export default defineEventHandler(async (event) => {
  await requireAccess(event, 'gallery', 'edit')
  await deleteGalleryPhoto(idParam(event))
  return { ok: true }
})
