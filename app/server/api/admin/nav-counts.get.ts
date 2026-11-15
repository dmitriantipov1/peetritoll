// Счётчики в боковом меню админки: GET /api/admin/nav-counts → { requests, orders }
// «Заявки» — сколько новых (статус «новая») среди видов, доступных сотруднику.
// «Заказы» — сколько ждут оплаты или оплачены и не собраны; без доступа к заказам — 0.
import { accessTo } from '#shared/access'

export default defineEventHandler(async (event) => {
  const user = await requireAdminUser(event)
  const orders =
    accessTo(user.role, user.permissions, 'orders') === 'none' ? 0 : await countNewOrders()
  return { requests: await countNewRequests(user), orders }
})
