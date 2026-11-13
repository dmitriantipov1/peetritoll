<script setup lang="ts">
// Шапка сайта: логотип, меню, переключатель языков, бургер на узких экранах.
// Разметка и классы — из прототипа (index.html), поведение бургера и выпадающего «Меню» — из js/main.js.

const { t, te, locale, locales } = useI18n()
const localePath = useLocalePath()
const switchLocalePath = useSwitchLocalePath()

// Адрес страницы один для всех языков, префикс языка добавляет localePath (5.1).
// У «Меню» — выпадающий список (созвон 12.11.2026): основное, банкетное, групповое меню
const items = computed(() =>
  ['restaurant', 'about', 'menu', 'museum', 'services', 'contacts', 'shop'].map((key) => ({
    key,
    to: localePath(`/${key}`),
    label: t(`nav.${key}`),
  })),
)
const menuPages = ['menu', 'banquet', 'group'] as const
const subItems = computed(() =>
  menuPages.map((key) => ({
    key,
    to: localePath(`/${key}`),
    label: t(`nav.sub.${key}.title`),
    // Подпись «Основное меню» есть только там, где название образное (по-русски)
    note: te(`nav.sub.${key}.note`) ? t(`nav.sub.${key}.note`) : '',
  })),
)

// Переключатель ведёт на эту же страницу на другом языке
const langs = computed(() =>
  locales.value.map((l) => ({
    code: l.code,
    label: String(l.label ?? l.code),
    name: l.name,
    to: switchLocalePath(l.code),
  })),
)

const open = ref(false)
const subOpen = ref(false)
const sub = ref<HTMLElement | null>(null)
const route = useRoute()
const routeBaseName = useRouteBaseName()

// «Меню» подсвечен на всех страницах меню, в том числе на дневном (lunch) — у него ссылки в списке нет
const pageName = computed(() => String(routeBaseName(route) ?? ''))
const onMenuPage = computed(() => [...menuPages, 'lunch'].includes(pageName.value))

// Закрываем меню при переходе на другую страницу
watch(
  () => route.fullPath,
  () => {
    open.value = false
    subOpen.value = false
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
    subOpen.value = false
    sub.value?.querySelector<HTMLElement>('.nav__toggle')?.focus()
  } else if (open.value) open.value = false
}
// Выпадающий список закрывается кликом мимо него
function onClick(e: MouseEvent) {
  if (subOpen.value && !sub.value?.contains(e.target as Node)) subOpen.value = false
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
              v-if="item.key === 'menu'"
              :ref="(el) => (sub = el as HTMLElement | null)"
              class="nav__item nav__item--sub"
              :class="{ 'is-open': subOpen }"
            >
              <button
                class="nav__link nav__toggle"
                :class="{ 'is-current': onMenuPage }"
                type="button"
                :aria-expanded="subOpen"
                aria-controls="nav-sub-menu"
                @click="subOpen = !subOpen"
              >
                {{ item.label }}<span class="nav__caret" aria-hidden="true" />
              </button>
              <div id="nav-sub-menu" class="nav__sub">
                <ul class="nav__sublist">
                  <li v-for="s in subItems" :key="s.key">
                    <NuxtLink
                      class="nav__sublink"
                      :to="s.to"
                      :aria-current="pageName === s.key ? 'page' : undefined"
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
