<script setup lang="ts">
// Шапка сайта: логотип, меню, переключатель языков, бургер на узких экранах.
// Разметка и классы — из прототипа (index.html), поведение бургера и выпадающих списков — из js/main.js.

const { t, te, locale, locales } = useI18n()
const localePath = useLocalePath()
const switchLocalePath = useSwitchLocalePath()

// Адрес страницы один для всех языков, префикс языка добавляет localePath (5.1).
// Выпадающие списки: у «Меню» (созвон 12.11.2026) — основное, банкетное, групповое меню;
// у «О нас» и «Услуг» (20.11.2026) — разделы этих страниц, новости и аудиогид
const items = computed(() =>
  ['about', 'restaurant', 'menu', 'museum', 'services', 'contacts', 'shop'].map((key) => ({
    key,
    to: localePath(`/${key}`),
    label: t(`nav.${key}`),
  })),
)

// Какие разделы включены — чтобы не было ссылок на выключенные новости и Pakri Express
const { data: shown } = useFetch<{ news: boolean; services: boolean; pakri: boolean }>(
  '/api/site/nav',
  { key: 'site-nav', query: { locale } },
)

const menuPages = ['menu', 'banquet', 'group'] as const
interface SubItem {
  key: string
  to: string
  label: string
  note?: string
  /** Страница, на которой пункт подсвечен (у ссылок на раздел той же страницы — нет) */
  page?: string
}
const subMenus = computed<Record<string, SubItem[]>>(() => ({
  about: [
    { key: 'family', to: localePath('/about') },
    { key: 'building', to: `${localePath('/about')}#zdanie` },
    { key: 'paldiski', to: `${localePath('/about')}#paldiski` },
    shown.value?.news !== false && { key: 'news', to: localePath('/news'), page: 'news' },
    { key: 'partners', to: `${localePath('/about')}#partnery` },
  ]
    .filter((i) => !!i)
    .map((i) => ({ ...i, label: t(`nav.sub.about.${i.key}`) })),
  menu: menuPages.map((key) => ({
    key,
    to: localePath(`/${key}`),
    label: t(`nav.sub.${key}.title`),
    // Подпись «Основное меню» есть только там, где название образное (по-русски)
    note: te(`nav.sub.${key}.note`) ? t(`nav.sub.${key}.note`) : '',
    page: key,
  })),
  services: [
    { key: 'all', to: localePath('/services'), page: 'services' },
    { key: 'tours', to: localePath('/excursions'), page: 'excursions' },
    { key: 'guides', to: `${localePath('/services')}#gidy` },
    { key: 'audioguide', to: localePath('/audioguide'), page: 'audioguide' },
    { key: 'radio', to: `${localePath('/services')}#radiogidy` },
    !!shown.value?.pakri && { key: 'pakri', to: `${localePath('/services')}#pakri-express` },
  ]
    .filter((i) => !!i)
    .map((i) => ({ ...i, label: t(`nav.sub.services.${i.key}`) })),
}))

// Переключатель ведёт на эту же страницу на другом языке; если её там нет — куда скажет
// страница (useLangFallback: новость, выключенная в этой версии сайта, → список новостей).
// Страница задаёт это позже, чем на сервере отрисована шапка, поэтому подменяем ссылку
// после загрузки — иначе разметка сервера и браузера не совпадёт и ссылка останется старой
const route = useRoute()
const langFallback = useLangFallback()
const mounted = ref(false)
onMounted(() => (mounted.value = true))
const langs = computed(() =>
  locales.value.map((l) => ({
    code: l.code,
    label: String(l.label ?? l.code),
    name: l.name,
    to:
      (mounted.value &&
        langFallback.value?.path === route.path &&
        langFallback.value.links[l.code]) ||
      // Без якоря (#napisat): сервер его не видит, и ссылки на сервере и в браузере разошлись бы
      switchLocalePath(l.code).split('#')[0],
  })),
)

const open = ref(false)
/** Какой выпадающий список открыт: about, menu, services */
const subOpen = ref<string | null>(null)
const routeBaseName = useRouteBaseName()

// Пункт подсвечен на всех страницах своего списка: «Меню» — и на дневном (lunch), у него ссылки
// в списке нет; «О нас» — и на новостях; «Услуги» — и на аудиогиде и программах
const pageName = computed(() => String(routeBaseName(route) ?? ''))
const currentGroup = computed(() => {
  const p = pageName.value
  if ([...menuPages, 'lunch'].includes(p)) return 'menu'
  if (p === 'about' || p.startsWith('news')) return 'about'
  if (['services', 'audioguide', 'excursions'].includes(p)) return 'services'
  return ''
})

// Закрываем меню при переходе на другую страницу
watch(
  () => route.fullPath,
  () => {
    open.value = false
    subOpen.value = null
  },
)

// Пока меню открыто, страница под ним не прокручивается.
// Напрямую, как в прототипе: useHead не снимает стиль с body при пустом значении.
watch(open, (value) => {
  document.body.style.overflow = value ? 'hidden' : ''
})

function onKey(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  if (subOpen.value) {
    document.querySelector<HTMLElement>(`[aria-controls="nav-sub-${subOpen.value}"]`)?.focus()
    subOpen.value = null
  } else if (open.value) open.value = false
}
// Выпадающий список закрывается кликом мимо него и по пункту (ссылки на разделы той же страницы:
// адрес меняется только якорем, и watch выше не срабатывает); бургер — тоже
function onClick(e: MouseEvent) {
  const target = e.target as Element
  if (target.closest?.('.nav__sublink')) {
    subOpen.value = null
    open.value = false
  } else if (subOpen.value && !target.closest?.('.nav__item--sub')) subOpen.value = null
}
onMounted(() => {
  document.addEventListener('keydown', onKey)
  document.addEventListener('click', onClick)
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
  document.removeEventListener('click', onClick)
  document.body.style.overflow = ''
})
</script>

<template>
  <header id="top" class="header">
    <div class="container header__inner">
      <NuxtLink class="header__logo" :to="localePath('/')" :aria-label="t('nav.logo')">
        <img src="/images/logo.svg" alt="Peetri Toll" width="109" height="57" />
      </NuxtLink>

      <nav id="nav" class="nav" :class="{ 'is-open': open }" :aria-label="t('nav.main')">
        <ul class="nav__list">
          <template v-for="item in items" :key="item.key">
            <li
              v-if="subMenus[item.key]"
              class="nav__item nav__item--sub"
              :class="{ 'is-open': subOpen === item.key }"
            >
              <button
                class="nav__link nav__toggle"
                :class="{ 'is-current': currentGroup === item.key }"
                type="button"
                :aria-expanded="subOpen === item.key"
                :aria-controls="`nav-sub-${item.key}`"
                @click="subOpen = subOpen === item.key ? null : item.key"
              >
                {{ item.label }}<span class="nav__caret" aria-hidden="true" />
              </button>
              <div :id="`nav-sub-${item.key}`" class="nav__sub">
                <ul class="nav__sublist">
                  <li v-for="s in subMenus[item.key]" :key="s.key">
                    <NuxtLink
                      class="nav__sublink"
                      :to="s.to"
                      :aria-current="s.page && pageName === s.page ? 'page' : undefined"
                    >
                      {{ s.label }}<small v-if="s.note">{{ s.note }}</small>
                    </NuxtLink>
                  </li>
                </ul>
              </div>
            </li>
            <li v-else>
              <NuxtLink class="nav__link" active-class="is-current" :to="item.to">
                {{ item.label }}
              </NuxtLink>
            </li>
          </template>
        </ul>
      </nav>

      <div class="lang" role="group" :aria-label="t('nav.language')">
        <NuxtLink
          v-for="lang in langs"
          :key="lang.code"
          class="lang__btn"
          :class="{ 'is-active': lang.code === locale }"
          :to="lang.to"
          :hreflang="lang.code"
          :lang="lang.code"
          :title="lang.name"
          :aria-current="lang.code === locale ? 'true' : undefined"
        >
          {{ lang.label }}
        </NuxtLink>
      </div>

      <button
        class="burger"
        type="button"
        :aria-label="open ? t('nav.close') : t('nav.open')"
        :aria-expanded="open"
        aria-controls="nav"
        @click="open = !open"
      >
        <span /><span /><span />
      </button>
    </div>
  </header>
</template>
