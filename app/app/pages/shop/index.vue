<script setup lang="ts">
// Магазин (shop.html прототипа), в шапке «Музейная лавка»: фильтр по категориям, значок корзины,
// карточки товаров, «Доставка и получение». Ссылка сразу на категорию — /shop#books.
// Раздел «Магазин» выключен в настройках — 404.
import type { SiteShop } from '#shared/site-shop'

const { t, locale } = useI18n()
const route = useRoute()

const { data: shop, error } = await useFetch<SiteShop>('/api/site/shop', { query: { locale } })
if (error.value || !shop.value) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

useHead({ title: () => `${t('shop.title')} — Tavern Peetri Toll` })

const cat = ref('all')
const list = ref<HTMLElement | null>(null)
const soft = useSoftFilter(list, '.product')
const shown = computed(
  () =>
    shop.value?.products.filter((p) => cat.value === 'all' || p.categorySlug === cat.value) ?? [],
)

function pick(slug: string) {
  cat.value = slug
  soft()
}
// /shop#books — сразу нужная категория (ссылки с главной)
function fromHash() {
  const slug = route.hash.slice(1)
  if (shop.value?.categories.some((c) => c.slug === slug)) cat.value = slug
}
onMounted(fromHash)
watch(() => route.hash, fromHash)
</script>

<template>
  <div v-if="shop">
    <PageHero
      :title="t('shop.title')"
      :crumb="t('nav.shop')"
      :lead="t('shop.lead')"
      image="/images/weapons-1.jpg"
    />

    <section class="section section--shop">
      <div class="container">
        <div class="shop-bar">
          <div class="chips" role="group" :aria-label="t('shop.categories')">
            <button
              class="chip"
              :class="{ 'is-active': cat === 'all' }"
              type="button"
              :aria-pressed="cat === 'all'"
              @click="pick('all')"
            >
              {{ t('shop.all') }}
            </button>
            <button
              v-for="c in shop.categories"
              :key="c.slug"
              class="chip"
              :class="{ 'is-active': cat === c.slug }"
              type="button"
              :aria-pressed="cat === c.slug"
              @click="pick(c.slug)"
            >
              {{ c.name }}
            </button>
          </div>
          <CartLink />
        </div>

        <ul ref="list" class="products shop-grid">
          <ShopCard v-for="p in shown" :key="p.id" :product="p" />
        </ul>
      </div>
    </section>

    <section id="dostavka" class="section section--bg2 section--compact">
      <div class="container">
        <SectionHead :crumb="t('shop.delivery.crumb')" :title="t('shop.delivery.title')" />
        <ul class="grid-4">
          <li v-for="k in ['estonia', 'abroad', 'pickup', 'digital']" :key="k" class="tile">
            <h3 class="tile__title">{{ t(`shop.delivery.${k}.title`) }}</h3>
            <p class="tile__text">{{ t(`shop.delivery.${k}.text`) }}</p>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>
