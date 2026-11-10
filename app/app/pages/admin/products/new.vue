<script setup lang="ts">
// Новый товар. После сохранения — в его карточку: там же загружаются файлы цифровых вариантов
import type { AdminShop } from '#shared/shop'

definePageMeta({ layout: 'admin', access: ['products'] })
defineI18nRoute(false)

const { can } = useAdminUser()
if (!can('products', 'edit')) await navigateTo('/admin/products', { replace: true })

const { data: shop } = await useFetch<AdminShop>('/api/admin/shop')
useHead({ title: 'Новый товар — админка Peetri Toll' })
</script>

<template>
  <AdminProductForm v-if="shop" :product="null" :categories="shop.categories" :can-edit="true" />
</template>
