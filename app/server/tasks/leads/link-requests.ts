// Привязать к контактам (лидам) заявки, у которых контакта нет: заведённые до лидов (8.2).
// Новые заявки привязываются сами при создании. Повторный запуск безопасен.
//
// Запуск при работающем приложении:
//   docker compose exec app npx nuxi task run leads:link-requests
// или в разработке: curl -X POST localhost:3000/_nitro/tasks/leads:link-requests
export default defineTask({
  meta: {
    name: 'leads:link-requests',
    description: 'Привязать к лидам заявки без контакта',
  },
  async run() {
    const n = await linkOrphanRequests()
    return { result: n ? `Привязано заявок: ${n}` : 'Все заявки уже привязаны' }
  },
})
