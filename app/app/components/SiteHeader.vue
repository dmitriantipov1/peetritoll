<script setup lang="ts">
// Шапка сайта: логотип, меню, переключатель языков, бургер на узких экранах.
// Разметка и классы — из прототипа (index.html), поведение бургера — из js/main.js.

// Адреса временные: языковые префиксы и адреса страниц на каждом языке — шаг 0.5 (5.1).
const items = [
  { to: '/restaurant', label: 'Ресторан' },
  { to: '/about', label: 'О нас' },
  { to: '/menu', label: 'Меню' },
  { to: '/museum', label: 'Музей' },
  { to: '/services', label: 'Услуги' },
  { to: '/contacts', label: 'Контакты' },
  { to: '/shop', label: 'Магазин' },
]

// Переключатель пока только визуальный, как в прототипе. Настоящий — шаг 0.5.
const langs = ['EE', 'EN', 'RU']
const lang = ref('RU')

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
      <NuxtLink class="header__logo" to="/" aria-label="Peetri Toll — на главную">
        <img src="/images/logo.svg" alt="Peetri Toll" width="109" height="57" />
      </NuxtLink>

      <nav id="nav" class="nav" :class="{ 'is-open': open }" aria-label="Главное меню">
        <ul class="nav__list">
          <li v-for="item in items" :key="item.to">
            <NuxtLink class="nav__link" active-class="is-current" :to="item.to">
              {{ item.label }}
            </NuxtLink>
          </li>
        </ul>
      </nav>

      <div class="lang" role="group" aria-label="Язык">
        <button
          v-for="code in langs"
          :key="code"
          class="lang__btn"
          :class="{ 'is-active': code === lang }"
          type="button"
          :aria-pressed="code === lang"
          @click="lang = code"
        >
          {{ code }}
        </button>
      </div>

      <button
        class="burger"
        type="button"
        :aria-label="open ? 'Закрыть меню' : 'Открыть меню'"
        :aria-expanded="open"
        aria-controls="nav"
        @click="open = !open"
      >
        <span /><span /><span />
      </button>
    </div>
  </header>
</template>
