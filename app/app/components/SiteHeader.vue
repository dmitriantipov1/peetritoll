<script setup lang="ts">
// Шапка сайта: логотип, меню, переключатель языков, бургер на узких экранах.
// Разметка и классы — из прототипа (index.html), поведение бургера — из js/main.js.

const { t, locale, locales } = useI18n()
const localePath = useLocalePath()
const switchLocalePath = useSwitchLocalePath()

// Адрес страницы один для всех языков, префикс языка добавляет localePath (5.1)
const items = computed(() =>
  ['restaurant', 'about', 'menu', 'museum', 'services', 'contacts', 'shop'].map((key) => ({
    to: localePath(`/${key}`),
    label: t(`nav.${key}`),
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
const route = useRoute()

// Закрываем меню при переходе на другую страницу
watch(
  () => route.fullPath,
  () => {
    open.value = false
  },
)

// Пока меню открыто, страница под ним не прокручивается.
// Напрямую, как в прототипе: useHead не снимает стиль с body при пустом значении.
watch(open, (value) => {
  document.body.style.overflow = value ? 'hidden' : ''
})

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && open.value) open.value = false
}
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey)
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
          <li v-for="item in items" :key="item.to">
            <NuxtLink class="nav__link" active-class="is-current" :to="item.to">
              {{ item.label }}
            </NuxtLink>
          </li>
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
