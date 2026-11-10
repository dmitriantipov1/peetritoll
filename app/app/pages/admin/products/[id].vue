<script setup lang="ts">
// Карточка товара
import type { AdminProduct, AdminShop } from '#shared/shop'

definePageMeta({ layout: 'admin', access: ['products'] })
defineI18nRoute(false)

const route = useRoute()
const { can } = useAdminUser()

const [{ data: product, error }, { data: shop }] = await Promise.all([
  useFetch<AdminProduct>(() => `/api/admin/products/${route.params.id}`),
  useFetch<AdminShop>('/api/admin/shop'),
])

useHead({
  title: () =>
    `${product.value?.translations.ru?.name ?? product.value?.translations.et?.name ?? 'Товар'} — админка Peetri Toll`,
})

const saved = ref(false)
function onSaved(value: AdminProduct) {
  product.value = value
  saved.value = true
  setTimeout(() => (saved.value = false), 3000)
}
</script>

<template>
  <div>
    <template v-if="error">
      <NuxtLink class="adm-back" to="/admin/products">← Товары</NuxtLink>
      <p class="adm-alert" role="alert">
        {{ apiErrorMessage(error, 'Не удалось загрузить товар.') }}
      </p>
    </template>
    <p v-if="saved" class="adm-alert" role="status">Сохранено.</p>
    <AdminProductForm
      v-if="product && shop"
      :product="product"
      :categories="shop.categories"
      :can-edit="can('products', 'edit')"
      @saved="onSaved"
    />
  </div>
</template>
