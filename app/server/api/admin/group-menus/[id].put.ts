// Сохранить обед для групп: PUT /api/admin/group-menus/:id
import { groupMenuInputSchema } from '#shared/group-menus'

export default defineEventHandler(async (event) => {
  const user = await requireAccess(event, 'menu', 'edit')
  const input = await readBodyWith(event, groupMenuInputSchema)
  return { id: await saveGroupMenu(idParam(event), input, user.id) }
})
