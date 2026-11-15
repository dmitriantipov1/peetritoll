<script setup lang="ts">
// Товар (product.html прототипа): фото с миниатюрами, категория, цена и «В корзину»,
// характеристики, «Только самовывоз» у антиквариата, «О предмете», «Ещё в лавке».
// Несколько вариантов (печатная книга и PDF) — выбор кнопками над ценой.
// Адрес — слаг на языке страницы; переключатель языков ведёт на этот же товар.
import type { SiteProduct } from '#shared/site-shop'
import { formatPrice } from '#shared/money'

const route = useRoute()
const { t, locale } = useI18n()
const localePath = useLocalePath()
const setI18nParams = useSetI18nParams()
const cart = useCart()

const slug = computed(() => String(route.params.slug))
const { data: item, error } = await useFetch<SiteProduct>('/api/site/shop/item', {
  query: { locale, slug },
})
if (error.value || !item.value) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

setI18nParams(
  Object.fromEntries(Object.entries(item.value.slugs).map(([l, s]) => [l, { slug: s }])),
)
setLangFallback(Object.keys(item.value.slugs), (l) => localePath('/shop', l))

useHead({ title: () => `${item.value?.name ?? ''} — Tavern Peetri Toll` })

const photo = ref(0)
const variantId = ref(
  item.value.variants.find((v) => v.stock !== 0)?.id ?? item.value.variants[0]?.id,
)
watch(item, (p) => {
  photo.value = 0
  variantId.value = p?.variants.find((v) => v.stock !== 0)?.id ?? p?.variants[0]?.id
})
const variant = computed(() => item.value?.variants.find((v) => v.id === variantId.value))
const soldOut = computed(() => variant.value?.stock === 0)
const full = computed(
  () => cart.loaded.value && !!variant.value && !soldOut.value && !cart.canAdd(variant.value),
)
const pickupOnly = computed(() =>
  item.value?.variants.some((v) => v.kind === 'physical' && v.delivery === 'pickup'),
)
const paragraphs = computed(() =>
  (item.value?.description ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean),
)
onMounted(cart.load)
</script>

<template>
  <div v-if="item">
    <section class="page-hero page-hero--short">
      <img class="hero__bg" src="/images/weapons-1.jpg" alt="" />
      <div class="container page-hero__content">
        <p class="page-hero__crumb">
          <NuxtLink :to="localePath('/')">{{ t('nav.home') }}</NuxtLink> /
          <NuxtLink :to="localePath('/shop')">{{ t('nav.shop') }}</NuxtLink> /
          <NuxtLink :to="`${localePath('/shop')}#${item.categorySlug}`">{{
            item.categoryName
          }}</NuxtLink>
        </p>
        <p class="page-hero__title">{{ t('shop.title') }}</p>
      </div>
    </section>

    <section class="section section--bg1">
      <div class="container pdp">
        <div class="pdp-gallery">
          <div
            class="pdp-gallery__main product__img"
            :class="{ 'is-missing': !item.photos.length }"
            :data-ph="item.photos.length ? undefined : item.slug"
          >
            <img
              v-if="item.photos[photo]"
              :src="item.photos[photo]!.url"
              :srcset="item.photos[photo]!.srcset"
              sizes="(max-width: 860px) 100vw, 600px"
              :alt="item.name"
            />
          </div>
          <ul
            v-if="item.photos.length > 1"
            class="pdp-gallery__thumbs"
            :aria-label="t('shop.photos')"
          >
            <li v-for="(ph, i) in item.photos" :key="ph.url">
              <button
                class="pdp-gallery__thumb"
                type="button"
                :aria-current="i === photo ? 'true' : undefined"
                :aria-label="t('shop.photo', { n: i + 1 })"
                @click="photo = i"
              >
                <span class="product__img"
                  ><img :src="ph.url" :srcset="ph.srcset" sizes="120px" alt="" loading="lazy"
                /></span>
              </button>
            </li>
          </ul>
        </div>

        <div class="pdp__info">
          <p class="product__cat">{{ item.categoryName }}</p>
          <h1 class="pdp__title">{{ item.name }}</h1>
          <p v-if="item.lead" class="pdp__lead">{{ item.lead }}</p>

          <div
            v-if="item.variants.length > 1"
            class="chips pdp__variants"
            role="group"
            :aria-label="t('shop.variant')"
          >
            <button
              v-for="v in item.variants"
              :key="v.id"
              class="chip"
              :class="{ 'is-active': v.id === variantId }"
              type="button"
              :aria-pressed="v.id === variantId"
              @click="variantId = v.id"
            >
              {{ v.label }}
            </button>
          </div>

          <div v-if="variant" class="pdp__buy">
            <p class="pdp__price">{{ formatPrice(variant.priceCents) }}</p>
            <button
              class="btn btn--solid"
              type="button"
              :disabled="soldOut || full"
              @click="cart.add(item, variant)"
            >
              {{ soldOut ? t('shop.soldOut') : full ? t('shop.inCart') : t('shop.add') }}
            </button>
          </div>

          <dl v-if="item.facts.length" class="facts facts--compact">
            <div v-for="f in item.facts" :key="f.label" class="facts__row">
              <dt>{{ f.label }}</dt>
              <dd>{{ f.value }}</dd>
            </div>
          </dl>

          <div v-if="pickupOnly" class="note pdp__note">
            <p>
              <strong>{{ t('shop.pickupOnly') }}</strong> {{ t('shop.pickupText') }}
              <NuxtLink :to="`${localePath('/shop')}#dostavka`">{{
                t('shop.delivery.title')
              }}</NuxtLink>
            </p>
          </div>
        </div>

        <div v-if="paragraphs.length" class="pdp__about prose">
          <h2 class="pdp__subtitle">{{ t('shop.about') }}</h2>
          <p v-for="(p, i) in paragraphs" :key="i">{{ p }}</p>
        </div>
      </div>
    </section>

    <section v-if="item.more.length" class="section section--shop section--compact">
      <div class="container">
        <SectionHead
          :crumb="t('shop.title')"
          :title="t('shop.more')"
          :more="{ to: localePath('/shop'), label: t('shop.allProducts') }"
        />
        <ul class="products">
          <ShopCard v-for="p in item.more" :key="p.id" :product="p" />
        </ul>
      </div>
    </section>
  </div>
</template>
