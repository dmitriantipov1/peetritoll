<script setup lang="ts">
// Корзина (cart.html прототипа): строки с количеством, «Итого», «Оформить заказ».
// Корзина живёт в браузере (useCart), поэтому страница рисуется после загрузки.
import { formatPrice } from '#shared/money'
import type { CartItem } from '~/composables/useCart'

const { t } = useI18n()
const localePath = useLocalePath()
const cart = useCart()
onMounted(cart.load)

useHead({ title: () => `${t('shop.cart')} — Tavern Peetri Toll` })

function what(i: CartItem) {
  // «Цифровая копия · Цифровая копия — …» не повторяем
  if (i.kind === 'digital') return t(i.label ? 'shop.cartPage.byEmail' : 'shop.cartPage.digital')
  return i.pickupOnly ? t('shop.cartPage.pickup') : t('shop.cartPage.physical')
}
const empty = computed(() => cart.loaded.value && !cart.items.value.length)
</script>

<template>
  <div>
    <section class="page-hero page-hero--short">
      <img class="hero__bg" src="/images/weapons-1.jpg" alt="" />
      <div class="container page-hero__content">
        <p class="page-hero__crumb">
          <NuxtLink :to="localePath('/')">{{ t('nav.home') }}</NuxtLink> /
          <NuxtLink :to="localePath('/shop')">{{ t('nav.shop') }}</NuxtLink> /
          {{ t('shop.cart') }}
        </p>
        <h1 class="page-hero__title">{{ t('shop.cart') }}</h1>
        <p class="page-hero__lead">{{ t('shop.cartPage.lead') }}</p>
      </div>
    </section>

    <section class="section section--shop" :class="{ 'is-empty': empty }">
      <div class="container">
        <div v-if="cart.loaded.value" class="cart-wrap">
          <div>
            <ul class="cart-lines" :aria-label="t('shop.cartPage.lines')">
              <li v-for="i in cart.items.value" :key="i.variantId" class="cart-line">
                <div
                  class="cart-line__img"
                  :class="{ 'is-missing': !i.photo }"
                  :data-ph="i.photo ? undefined : i.slug.slice(0, 24)"
                >
                  <img v-if="i.photo" :src="i.photo" alt="" loading="lazy" />
                </div>
                <div class="cart-line__body">
                  <p class="cart-line__name">
                    <NuxtLink :to="localePath(`/shop/${i.slug}`)">{{ i.name }}</NuxtLink>
                  </p>
                  <p class="cart-line__what">
                    <template v-if="i.label">{{ i.label }} · </template>{{ what(i) }}
                  </p>
                  <p class="cart-line__price">
                    {{ t('shop.cartPage.each', { price: formatPrice(i.priceCents) }) }}
                  </p>
                </div>
                <div class="cart-line__qty">
                  <span v-if="i.maxQty === 1" class="cart-line__one">{{
                    t('shop.cartPage.one')
                  }}</span>
                  <div v-else class="calc-step">
                    <button
                      class="calc-step__btn"
                      type="button"
                      :aria-label="t('shop.cartPage.less', { name: i.name })"
                      :disabled="i.qty <= 1"
                      @click="cart.setQty(i.variantId, i.qty - 1)"
                    >
                      −
                    </button>
                    <span v-bump="i.qty" class="calc-step__input" aria-live="polite">{{
                      i.qty
                    }}</span>
                    <button
                      class="calc-step__btn"
                      type="button"
                      :aria-label="t('shop.cartPage.more', { name: i.name })"
                      :disabled="i.qty >= i.maxQty"
                      @click="cart.setQty(i.variantId, i.qty + 1)"
                    >
                      +
                    </button>
                  </div>
                  <button class="cart-line__remove" type="button" @click="cart.remove(i.variantId)">
                    {{ t('shop.cartPage.remove') }}
                  </button>
                </div>
                <p v-bump="i.qty" class="cart-line__sum">
                  <TweenNumber :value="i.qty * i.priceCents" :format="formatPrice" />
                </p>
              </li>
            </ul>
            <div class="cart-empty">
              <p class="quote">{{ t('shop.cartPage.empty') }}</p>
              <p>{{ t('shop.cartPage.emptyText') }}</p>
              <NuxtLink class="btn btn--red" :to="localePath('/shop')">{{
                t('shop.cartPage.toShop')
              }}</NuxtLink>
            </div>
          </div>
          <aside class="cart-side" :aria-label="t('shop.cartPage.total')">
            <p class="calc-side__title">{{ t('shop.cartPage.total') }}</p>
            <dl class="cart-sum">
              <div>
                <dt>{{ t('shop.cartPage.count') }}</dt>
                <dd v-bump="cart.count.value">{{ cart.count.value }}</dd>
              </div>
              <div class="cart-sum__total">
                <dt>{{ t('shop.cartPage.sum') }}</dt>
                <dd><TweenNumber :value="cart.sumCents.value" :format="formatPrice" /></dd>
              </div>
            </dl>
            <p class="calc-side__note">{{ t('shop.cartPage.note') }}</p>
            <NuxtLink class="btn btn--red cart-side__go" :to="localePath('/checkout')">{{
              t('shop.cartPage.checkout')
            }}</NuxtLink>
            <NuxtLink class="link-more" :to="localePath('/shop')">{{
              t('shop.cartPage.back')
            }}</NuxtLink>
          </aside>
        </div>
      </div>
    </section>
  </div>
</template>
