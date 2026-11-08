// Раздача загруженных картинок: /uploads/2026/11/<id>/800.webp из NUXT_UPLOADS_DIR.
// Файл по адресу никогда не меняется (новая картинка — новая папка), поэтому кэш на год.
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { join, normalize, sep } from 'node:path'

export default defineEventHandler(async (event) => {
  const root = uploadsDir()
  const path = normalize(join(root, getRouterParam(event, 'path') ?? ''))

  // Только файлы внутри хранилища и только наши WebP — никаких «../» наружу
  if (!path.startsWith(root + sep) || !path.endsWith('.webp')) {
    throw createError({ statusCode: 404, message: 'Нет такой картинки' })
  }
  const info = await stat(path).catch(() => null)
  if (!info?.isFile()) throw createError({ statusCode: 404, message: 'Нет такой картинки' })

  setResponseHeaders(event, {
    'Content-Type': 'image/webp',
    'Content-Length': String(info.size),
    'Cache-Control': 'public, max-age=31536000, immutable',
  })
  return sendStream(event, createReadStream(path))
})
