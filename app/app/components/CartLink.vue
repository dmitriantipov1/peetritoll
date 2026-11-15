<script setup lang="ts">
// Значок корзины (14.11.2026, просьба заказчицы): сумка — «лавка», число — сколько товаров.
const { t } = useI18n()
const localePath = useLocalePath()
const cart = useCart()
onMounted(cart.load)
</script>

<template>
  <NuxtLink
    class="cart-link"
    :to="localePath('/cart')"
    :aria-label="t('shop.cartLabel', { n: cart.count.value })"
    :title="t('shop.cart')"
  >
    <svg
      class="cart-link__icon"
      viewBox="0 0 24 24"
      width="28"
      height="28"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M5 8h14l-1.2 12.1a1 1 0 0 1-1 .9H7.2a1 1 0 0 1-1-.9L5 8Z"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linejoin="round"
      />
      <path
        d="M9 10V6.5a3 3 0 0 1 6 0V10"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
      />
    </svg>
    <span v-bump="cart.count.value" class="cart-link__count">{{ cart.count.value }}</span>
  </NuxtLink>
</template>
