// Отменить заказы, не оплаченные за час (5.3): остаток возвращается на полку, платёж SumUp
// закрывается. Запускается сам раз в 10 минут (nitro.scheduledTasks в nuxt.config.ts).
// Повторный запуск безопасен. Вручную:
//   docker compose exec app npx nuxi task run orders:expire
// или в разработке: curl -X POST localhost:3000/_nitro/tasks/orders:expire
export default defineTask({
  meta: {
    name: 'orders:expire',
    description: 'Отменить заказы, не оплаченные за час, и вернуть остаток',
  },
  async run() {
    const n = await expireUnpaidOrders()
    return { result: n ? `Отменено заказов: ${n}` : 'Просроченных неоплаченных заказов нет' }
  },
})
