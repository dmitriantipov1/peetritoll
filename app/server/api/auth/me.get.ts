// Кто вошёл: GET /api/auth/me → сотрудник с правами, без входа — 401
export default defineEventHandler(async (event) => {
  return toAdminUser(await requireAdminUser(event))
})
