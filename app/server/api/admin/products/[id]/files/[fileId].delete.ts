// Удалить файл цифрового варианта: DELETE /api/admin/products/:id/files/:fileId
export default defineEventHandler(async (event) => {
  await requireAccess(event, 'products', 'edit')
  await deleteVariantFile(idParam(event), fileIdParam(event))
  return { ok: true }
})
