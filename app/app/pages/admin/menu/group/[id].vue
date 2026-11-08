<script setup lang="ts">
// Блюдо: Групповое меню. Форма — components/AdminCatalogDishForm.vue
import type { AdminCatalog } from '#shared/catalog'

definePageMeta({ layout: 'admin', access: ['menu'] })
defineI18nRoute(false)
useHead({ title: 'Блюдо — Групповое меню — админка Peetri Toll' })

const route = useRoute()
const { data, error } = await useFetch<AdminCatalog>('/api/admin/catalog/group')
</script>

<template>
  <div>
    <p v-if="error" class="adm-alert" role="alert">
      {{ apiErrorMessage(error, 'Не удалось загрузить меню.') }}
    </p>
    <AdminCatalogDishForm
      v-if="data"
      kind="group"
      :catalog="data"
      :dish-id="Number(route.params.id)"
    />
  </div>
</template>
