// Список материалов: GET /api/admin/materials → { materials, newsEnabled }
import type { AdminMaterialsList } from '#shared/materials'

export default defineEventHandler(async (event): Promise<AdminMaterialsList> => {
  await requireAccess(event, 'materials', 'view')
  const [list, sections] = await Promise.all([loadAdminMaterials(), readSections()])
  return { materials: list, newsEnabled: sections.news.enabled }
})
