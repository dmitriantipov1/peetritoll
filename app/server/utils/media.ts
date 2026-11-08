// Приём картинки: проверить, уменьшить до нужных ширин в WebP, сохранить на диск, записать в media.
// Доступно в серверном коде без импорта.
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import sharp, { type Metadata } from 'sharp'
import { media } from '../db/schema'
import { mediaWidths, toMediaImage } from '#shared/media'

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024
const MIN_SIDE = 600 // меньше — на сайте будет мыльно
const ALLOWED = new Set(['jpeg', 'png', 'webp'])

/** Папка хранилища на диске (NUXT_UPLOADS_DIR), абсолютный путь */
export function uploadsDir() {
  return resolve(useRuntimeConfig().uploadsDir)
}

/**
 * Сохранить картинку. Формат определяем по содержимому, а не по имени файла.
 * Возвращает картинку для браузера. Ошибки — 400 с понятным текстом.
 * minSide: 0 — без проверки размера (перенос со старого сайта, где фото маленькие).
 */
export async function saveImage(
  buffer: Buffer,
  source: string | null,
  userId: number | null,
  { minSide = MIN_SIDE }: { minSide?: number } = {},
) {
  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw createError({ statusCode: 400, message: 'Файл больше 15 МБ' })
  }

  let meta: Metadata
  try {
    meta = await sharp(buffer).metadata()
  } catch {
    throw createError({ statusCode: 400, message: 'Это не картинка или файл повреждён' })
  }
  if (!meta.format || !ALLOWED.has(meta.format)) {
    throw createError({ statusCode: 400, message: 'Нужен JPG, PNG или WebP' })
  }

  // Учитываем поворот из EXIF: фото с телефона часто «лежат на боку»
  const image = sharp(buffer).rotate()
  const { width = 0, height = 0 } = await image
    .metadata()
    .then((m) => (m.orientation && m.orientation >= 5 ? { width: m.height, height: m.width } : m))
  if (Math.max(width, height) < minSide) {
    throw createError({
      statusCode: 400,
      message: `Картинка слишком маленькая: ${width}×${height}. Нужно от ${MIN_SIDE} px по длинной стороне, лучше от 1200`,
    })
  }

  // Самая большая версия — исходная ширина, но не больше 1600; меньшие — из стандартных.
  // 2400 → 320, 800, 1600; 1400 → 320, 800, 1400; 315 → 315. Маленькое не растягиваем
  const top = Math.min(width, mediaWidths[mediaWidths.length - 1]!)
  const sizes: number[] = [...mediaWidths.filter((w) => w < top), top]

  const id = randomUUID()
  const now = new Date()
  const folder = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${id}`
  const dir = join(uploadsDir(), folder)
  await mkdir(dir, { recursive: true })

  try {
    let saved = { width, height }
    for (const w of sizes) {
      const out = await image
        .clone()
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer({ resolveWithObject: true })
      await writeFile(join(dir, `${w}.webp`), out.data)
      saved = { width: out.info.width, height: out.info.height }
    }

    const [row] = await useDb()
      .insert(media)
      .values({
        id,
        folder,
        sizes,
        width: saved.width,
        height: saved.height,
        source,
        createdBy: userId,
      })
      .returning()
    return toMediaImage(row!)
  } catch (e) {
    // Не оставляем на диске файлы без записи в базе
    await rm(dir, { recursive: true, force: true })
    throw e
  }
}
