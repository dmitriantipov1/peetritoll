// Материал для карточки: GET /api/admin/materials/:id
export default defineEventHandler(async (event) => {
  await requireAccess(event, 'materials', 'view')
  return await loadAdminMaterial(materialIdParam(event))
})
