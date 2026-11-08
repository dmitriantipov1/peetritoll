// Раздел «Новости» на сайте — переключатель над списком: PUT /api/admin/materials/news-section
// { enabled }. Тот же выключатель — в «Настройках сайта»; хранится в sections.news
import { z } from 'zod'

const bodySchema = z.object({ enabled: z.boolean() })

export default defineEventHandler(async (event) => {
  const user = await requireAccess(event, 'materials', 'edit')
  const { enabled } = await readBodyWith(event, bodySchema)
  await setSectionEnabled('news', enabled, user.id)
  return { ok: true }
})
