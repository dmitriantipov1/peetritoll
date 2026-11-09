// Галерея (страница «Ресторан»): что отдаёт сервер админке и что принимает.
import { z } from 'zod'
import { contentLocales } from './locales'
import type { Localized } from './menu'
import type { MediaImage } from './media'

export interface AdminGalleryCategory {
  id: number
  names: Localized<string>
}

export interface AdminGalleryPhoto {
  id: number
  categoryId: number
  image: MediaImage
  isVisible: boolean
  /** Подпись — она же alt картинки */
  captions: Localized<string>
}

export interface AdminGallery {
  categories: AdminGalleryCategory[]
  /** Все фото в порядке показа на сайте */
  photos: AdminGalleryPhoto[]
}

const captionsSchema = z.partialRecord(z.enum(contentLocales), z.string().trim().max(200))

export const galleryPhotoCreateSchema = z.object({
  mediaId: z.uuid(),
  categoryId: z.number().int().positive(),
})

export const galleryPhotoInputSchema = z.object({
  categoryId: z.number().int().positive(),
  isVisible: z.boolean(),
  captions: captionsSchema,
})
export type GalleryPhotoInput = z.infer<typeof galleryPhotoInputSchema>

// Категория — только название на трёх языках, как отметка блюда
export { markInputSchema as galleryCategoryInputSchema, orderInputSchema } from './menu'
