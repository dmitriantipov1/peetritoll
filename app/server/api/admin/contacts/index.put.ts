// Сохранить контакты и часы целиком: PUT /api/admin/contacts { hours, contacts }
import { adminContactsSchema } from '#shared/contacts'

export default defineEventHandler(async (event) => {
  const user = await requireAccess(event, 'contacts', 'edit')
  const value = await readBodyWith(event, adminContactsSchema)
  return await saveContacts(value, user.id)
})
