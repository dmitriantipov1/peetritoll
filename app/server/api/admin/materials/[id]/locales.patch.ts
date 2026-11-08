// Где показывать — языки прямо из списка: PATCH /api/admin/materials/:id/locales { locales }
import { materialLocalesSchema } from '#shared/materials'

export default defineEventHandler(async (event) => {
  const user = await requireAccess(event, 'materials', 'edit')
  const { locales } = await readBodyWith(event, materialLocalesSchema)
  await setMaterialLocales(materialIdParam(event), locales, user.id)
  return { ok: true }
})
