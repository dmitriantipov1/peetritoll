// Файлы цифровых вариантов (7.4): PDF, аудио, архивы, снимки в высоком разрешении — по языкам.
// Лежат в закрытой папке (NUXT_FILES_DIR, в Docker — том files), не в /uploads: наружу их отдаёт
// только сервер — админке для проверки, покупателю по ссылке после оплаты (этап 4).
// Загрузка — потоком прямо на диск: аудиокнига в сотни мегабайт не читается в память целиком.
// Доступно в серверном коде без импорта.
import { randomUUID } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { mkdir, rename, rm, stat } from 'node:fs/promises'
import { dirname, extname, join, resolve, sep } from 'node:path'
import { Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import type { H3Event } from 'h3'
import { and, eq } from 'drizzle-orm'
import { productFiles, productVariants } from '../db/schema'
import type { ContentLocale } from '#shared/locales'
import { MAX_PRODUCT_FILE_MB, productFileTypes } from '#shared/shop'

export function filesDir() {
  return resolve(useRuntimeConfig().filesDir)
}

/** Путь внутри закрытой папки → полный, без выхода за её пределы */
function fullPath(path: string): string {
  const root = filesDir()
  const full = resolve(root, path)
  if (!full.startsWith(root + sep)) throw new Error(`Путь вне папки файлов: ${path}`)
  return full
}

/** Стереть файлы с диска; чего уже нет — не ошибка */
export async function removeProductFiles(paths: string[]) {
  for (const path of paths) {
    await rm(fullPath(path), { force: true }).catch((e) => console.error('Файл не удалён', path, e))
  }
}

/** Имя файла у покупателя: без путей и управляющих символов */
function cleanFilename(name: string): string {
  const base = name.split(/[\\/]/).at(-1) ?? ''
  return [...base]
    .filter((ch) => ch.charCodeAt(0) >= 32 && !'"<>|:*?'.includes(ch))
    .join('')
    .trim()
    .slice(0, 150)
}

/**
 * Принять файл варианта на одном языке: тело запроса — сам файл, имя — в ?name=.
 * Прежний файл этого языка заменяется. Возвращает запись о файле.
 */
export async function saveVariantFile(
  event: H3Event,
  productId: number,
  variantId: number,
  locale: ContentLocale,
  userId: number,
) {
  const [variant] = await useDb()
    .select({ kind: productVariants.kind })
    .from(productVariants)
    .where(and(eq(productVariants.id, variantId), eq(productVariants.productId, productId)))
    .limit(1)
  if (!variant) throw createError({ statusCode: 404, message: 'Вариант не найден' })
  if (variant.kind !== 'digital') {
    throw createError({ statusCode: 400, message: 'Файл нужен только цифровому варианту' })
  }

  const filename = cleanFilename(String(getQuery(event).name ?? ''))
  const ext = extname(filename).slice(1).toLowerCase()
  const mime = productFileTypes[ext]
  if (!filename || !mime) {
    throw createError({
      statusCode: 400,
      message: `Подходят файлы: ${Object.keys(productFileTypes).join(', ')}`,
    })
  }

  const limit = MAX_PRODUCT_FILE_MB * 1024 * 1024
  const declared = Number(getRequestHeader(event, 'content-length') ?? 0)
  if (declared > limit) {
    throw createError({ statusCode: 413, message: `Файл больше ${MAX_PRODUCT_FILE_MB} МБ` })
  }

  // Новое имя на диске — без пользовательского ввода: варианты/язык-случайное.расширение
  const path = join(String(variantId), `${locale}-${randomUUID()}.${ext}`)
  const target = fullPath(path)
  const temp = `${target}.part`
  await mkdir(dirname(target), { recursive: true })

  let size = 0
  const counter = new Transform({
    transform(chunk: Buffer, _enc, done) {
      size += chunk.length
      // Длину в заголовке можно не прислать — считаем и сами
      if (size > limit)
        done(createError({ statusCode: 413, message: `Файл больше ${MAX_PRODUCT_FILE_MB} МБ` }))
      else done(null, chunk)
    },
  })
  try {
    await pipeline(event.node.req, counter, createWriteStream(temp))
    if (!size) throw createError({ statusCode: 400, message: 'Пустой файл' })
    await rename(temp, target)
  } catch (e) {
    await rm(temp, { force: true })
    throw e
  }

  const [old] = await useDb()
    .select({ path: productFiles.path })
    .from(productFiles)
    .where(and(eq(productFiles.variantId, variantId), eq(productFiles.locale, locale)))
    .limit(1)
  const [row] = await useDb()
    .insert(productFiles)
    .values({ variantId, locale, path, filename, mime, size, uploadedBy: userId })
    .onConflictDoUpdate({
      target: [productFiles.variantId, productFiles.locale],
      set: { path, filename, mime, size, uploadedBy: userId, uploadedAt: new Date() },
    })
    .returning()
  if (old && old.path !== path) await removeProductFiles([old.path])
  return row!
}

export async function deleteVariantFile(productId: number, fileId: number) {
  const [row] = await useDb()
    .select({ id: productFiles.id, path: productFiles.path, productId: productVariants.productId })
    .from(productFiles)
    .innerJoin(productVariants, eq(productVariants.id, productFiles.variantId))
    .where(eq(productFiles.id, fileId))
    .limit(1)
  if (!row || row.productId !== productId) {
    throw createError({ statusCode: 404, message: 'Файл не найден' })
  }
  await useDb().delete(productFiles).where(eq(productFiles.id, fileId))
  await removeProductFiles([row.path])
}

/** Отдать файл админке — проверить, что загрузили то, что нужно */
export async function sendProductFile(event: H3Event, productId: number, fileId: number) {
  const [row] = await useDb()
    .select({ file: productFiles, productId: productVariants.productId })
    .from(productFiles)
    .innerJoin(productVariants, eq(productVariants.id, productFiles.variantId))
    .where(eq(productFiles.id, fileId))
    .limit(1)
  if (!row || row.productId !== productId) {
    throw createError({ statusCode: 404, message: 'Файл не найден' })
  }
  const full = fullPath(row.file.path)
  const info = await stat(full).catch(() => null)
  if (!info) throw createError({ statusCode: 404, message: 'Файла нет на диске' })
  setResponseHeaders(event, {
    'content-type': row.file.mime,
    'content-length': info.size,
    'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(row.file.filename)}`,
    'cache-control': 'private, no-store',
  })
  return sendStream(event, createReadStream(full))
}

export function fileIdParam(event: H3Event): number {
  const id = Number(getRouterParam(event, 'fileId'))
  if (!Number.isInteger(id) || id <= 0)
    throw createError({ statusCode: 400, message: 'Неверный номер' })
  return id
}
