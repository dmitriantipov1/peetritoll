import type { Section } from '#shared/access'

declare module '#app' {
  interface PageMeta {
    /**
     * Страница админки открывается, если есть доступ хотя бы к одному из разделов
     * (смотрит или правит). Без этого поля — любому вошедшему сотруднику.
     */
    access?: readonly Section[]
  }
}

export {}
