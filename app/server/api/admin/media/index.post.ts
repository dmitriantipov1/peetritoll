// Загрузка картинки: POST /api/admin/media, multipart, поле file → MediaImage.
// Картинку сразу уменьшаем и сохраняем; к блюду она привязывается при сохранении карточки.
import { accessTo, allows, type Section } from '#shared/access'

// Где в админке есть картинки — загружать может тот, кто правит хотя бы один из этих разделов
const sectionsWithImages: Section[] = ['menu', 'menu.lunch', 'materials', 'products', 'gallery']

export default defineEventHandler(async (event) => {
  const user = await requireAdminUser(event)
  if (!sectionsWithImages.some((s) => allows(accessTo(user.role, user.permissions, s), 'edit'))) {
    throw createError({ statusCode: 403, message: 'Нет права загружать картинки' })
  }

  // Размер проверяем до чтения тела: не принимаем в память гигантский запрос
  const length = Number(getRequestHeader(event, 'content-length') ?? 0)
  if (length > MAX_UPLOAD_BYTES + 64 * 1024) {
    throw createError({ statusCode: 413, message: 'Файл больше 15 МБ' })
  }

  const parts = await readMultipartFormData(event)
  const file = parts?.find((p) => p.name === 'file' && p.data?.length)
  if (!file) throw createError({ statusCode: 400, message: 'Выберите файл' })

  return await saveImage(file.data, file.filename ?? null, user.id)
})
