// Контакты и часы: GET /api/admin/contacts
export default defineEventHandler(async (event) => {
  await requireAccess(event, 'contacts', 'view')
  return await loadContacts()
})
