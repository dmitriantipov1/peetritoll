// Удалить материал: DELETE /api/admin/materials/:id
export default defineEventHandler(async (event) => {
  await requireAccess(event, 'materials', 'edit')
  await deleteMaterial(materialIdParam(event))
  return { ok: true }
})
