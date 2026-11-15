<script setup lang="ts">
// «Добавлено в корзину» внизу экрана на 4 секунды (как в прототипе).
const { t } = useI18n()
const localePath = useLocalePath()
const { toast } = useCart()
const shown = ref(false)
const name = ref('')
let timer: ReturnType<typeof setTimeout> | undefined

watch(toast, (value) => {
  if (!value) return
  name.value = value
  shown.value = true
  toast.value = null // следующее добавление того же товара снова покажет плашку
  clearTimeout(timer)
  timer = setTimeout(() => (shown.value = false), 4000)
})
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <div class="cart-toast" :class="{ 'is-shown': shown }" role="status">
    <span>{{ t('shop.added', { name }) }}</span>
    <NuxtLink :to="localePath('/cart')">{{ t('shop.toCart') }}</NuxtLink>
  </div>
</template>
