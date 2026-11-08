// Загруженные картинки: какие размеры делаем и как собрать адрес. Общий для сервера и браузера.

/** Ширины, до которых уменьшаем: превью в админке, карточка блюда, крупный просмотр */
export const mediaWidths = [320, 800, 1600] as const

/** Картинка, какой её видит браузер */
export interface MediaImage {
  id: string
  /** Адрес средней версии — для обычного <img src> */
  url: string
  /** Все версии для <img srcset>: «/uploads/…/320.webp 320w, …» */
  srcset: string
  width: number
  height: number
}

/** Меньше этого по ширине — на сайте фото будет мыльным, админка просит заменить */
export const GOOD_WIDTH = 800

export function mediaUrl(folder: string, width: number) {
  return `/uploads/${folder}/${width}.webp`
}

export function toMediaImage(row: {
  id: string
  folder: string
  width: number
  height: number
  sizes: number[]
}): MediaImage {
  const sizes = [...row.sizes].sort((a, b) => a - b)
  const middle = sizes.find((w) => w >= 800) ?? sizes[sizes.length - 1]!
  return {
    id: row.id,
    url: mediaUrl(row.folder, middle),
    srcset: sizes.map((w) => `${mediaUrl(row.folder, w)} ${w}w`).join(', '),
    width: row.width,
    height: row.height,
  }
}
