<script setup lang="ts">
// Карточка товара — вариант 8 (выбор заказчицы 10.11.2026), .product прототипа: без категории,
// под названием одна строка (у книг — автор). Один вариант — «В корзину» сразу (продан — «Продано»),
// несколько — «Выбрать» на странице товара.
import type { SiteShopCard } from '#shared/site-shop'
import { formatPrice } from '#shared/money'

const props = defineProps<{ product: SiteShopCard }>()

const { t } = useI18n()
const localePath = useLocalePath()
const cart = useCart()
const to = computed(() => localePath(`/shop/${props.product.slug}`))
const quick = computed(() => props.product.quickVariant)
const soldOut = computed(() => quick.value?.stock === 0)
// Штучный уже в корзине — второй раз не положить
const full = computed(
  () => cart.loaded.value && !!quick.value && !soldOut.value && !cart.canAdd(quick.value),
)
</script>

<template>
  <li class="product">
    <div
      class="product__img"
      :class="{ 'is-missing': !product.photo }"
      :data-ph="product.photo ? undefined : product.slug"
    >
      <img
        v-if="product.photo"
        :src="product.photo.url"
        :srcset="product.photo.srcset"
        sizes="(max-width: 640px) 100vw, 300px"
        :alt="product.name"
        loading="lazy"
      />
    </div>
    <div class="product__body">
      <h3 class="product__name">
        <NuxtLink class="product__link" :to="to">{{ product.name }}</NuxtLink>
      </h3>
      <p v-if="product.lead" class="product__desc">{{ product.lead }}</p>
    </div>
    <div class="product__foot">
      <p class="product__price">
        <template v-if="product.priceFrom">{{ t('shop.from') }} </template
        >{{ formatPrice(product.priceCents) }}
      </p>
      <button
        v-if="quick"
        class="btn btn--sm"
        type="button"
        :disabled="soldOut || full"
        @click="cart.add(product, quick)"
      >
        {{ soldOut ? t('shop.soldOut') : full ? t('shop.inCart') : t('shop.add') }}
      </button>
      <NuxtLink v-else class="btn btn--sm" :to="to">{{ t('shop.choose') }}</NuxtLink>
    </div>
  </li>
</template>
