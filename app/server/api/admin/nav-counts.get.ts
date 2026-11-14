// Счётчики в боковом меню админки: GET /api/admin/nav-counts → { requests }
// «Заявки» — сколько новых (статус «новая») среди видов, доступных сотруднику.
// Заказы появятся вместе с корзиной и SumUp (этап 4).
export default defineEventHandler(async (event) => {
  const user = await requireAdminUser(event)
  return { requests: await countNewRequests(user) }
})
