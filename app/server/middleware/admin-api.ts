// Все запросы /api/admin/** — только для вошедших сотрудников.
// Права на конкретный раздел каждый обработчик проверяет сам: requireAccess(event, 'menu', 'edit').
export default defineEventHandler(async (event) => {
  if (getRequestURL(event).pathname.startsWith('/api/admin/')) {
    await requireAdminUser(event)
  }
})
