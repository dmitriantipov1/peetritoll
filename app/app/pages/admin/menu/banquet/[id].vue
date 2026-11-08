<script setup lang="ts">
// Блюдо: Банкетное меню. Форма — components/AdminCatalogDishForm.vue
import type { AdminCatalog } from '#shared/catalog'

definePageMeta({ layout: 'admin', access: ['menu'] })
defineI18nRoute(false)
useHead({ title: 'Блюдо — Банкетное меню — админка Peetri Toll' })

const route = useRoute()
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
      :dish-id="Number(route.params.id)"
    />
  </div>
</template>
