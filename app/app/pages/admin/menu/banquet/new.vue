<script setup lang="ts">
// Новое блюдо: Банкетное меню. Форма — components/AdminCatalogDishForm.vue
import type { AdminCatalog } from '#shared/catalog'

definePageMeta({ layout: 'admin', access: ['menu'] })
defineI18nRoute(false)
useHead({ title: 'Новое блюдо — Банкетное меню — админка Peetri Toll' })

const route = useRoute()
const { can } = useAdminUser()
if (!can('menu', 'edit')) await navigateTo('/admin/menu/banquet', { replace: true })

const { data, error } = await useFetch<AdminCatalog>('/api/admin/catalog/banquet')
</script>

<template>
  <div>
    <p v-if="error" class="adm-alert" role="alert">
      {{ apiErrorMessage(error, 'Не удалось загрузить меню.') }}
    </p>
    <AdminCatalogDishForm
      v-if="data"
      kind="banquet"
      :catalog="data"
      :dish-id="null"
      :category-id="Number(route.query.category) || undefined"
    />
  </div>
</template>
