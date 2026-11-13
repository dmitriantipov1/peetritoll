<script setup lang="ts">
// Страница-материал (5.7): тексты, которые заказчица ведёт в админке, — политика конфиденциальности,
// cookies и другие. Адрес — слаг перевода: /ru/privacy. Разделы сайта (/ru/menu…) — свои страницы,
// их адреса для материалов зарезервированы (reservedPageSlugs).
import type { SitePage } from '#shared/site-pages'

const route = useRoute()
const { locale } = useI18n()
const setI18nParams = useSetI18nParams()

const slug = computed(() => String(route.params.slug))
const { data: page, error } = await useFetch<SitePage>('/api/site/page', {
  query: { locale, slug },
})
if (error.value || !page.value) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

// Переключатель языков ведёт на эту же страницу по её адресу на другом языке
setI18nParams(
  Object.fromEntries(Object.entries(page.value.slugs).map(([l, s]) => [l, { slug: s }])),
)

useHead({ title: () => `${page.value?.title ?? ''} — Tavern Peetri Toll` })
</script>

<template>
  <div v-if="page">
    <PageHero
      :title="page.title"
      :image="page.cover?.url ?? '/images/restaurant-house.jpg'"
      :crumb="page.title"
      :lead="page.lead ?? undefined"
    />
    <section class="section section--bg1">
      <div class="container">
        <!-- Текст из редактора админки, очищен на сервере при сохранении (server/utils/rich-text.ts) -->
        <!-- eslint-disable-next-line vue/no-v-html -->
        <article class="article article--rich" v-html="page.body" />
      </div>
    </section>
  </div>
</template>
