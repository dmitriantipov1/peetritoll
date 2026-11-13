// Куда ведёт переключатель языков, если этой страницы на другом языке нет: новость или
// страница-материал выключена в версии сайта (8.5). Без этого switchLocalePath дал бы тот же
// адрес на другом языке — и 404. Привязано к адресу страницы: на другой странице не действует.
import type { ContentLocale } from '#shared/locales'
export function useLangFallback() {
  return useState<{ path: string; links: Record<string, string> } | null>(
    'lang-fallback',
    () => null,
  )
}

/** Страница: для языков, которых нет в available, переключатель ведёт на fallback(язык) */
export function setLangFallback(available: string[], fallback: (locale: ContentLocale) => string) {
  const { locales } = useI18n()
  const route = useRoute()
  useLangFallback().value = {
    path: route.path,
    links: Object.fromEntries(
      locales.value
        .map((l) => l.code)
        .filter((code) => !available.includes(code))
        .map((code) => [code, fallback(code as ContentLocale)]),
    ),
  }
}
