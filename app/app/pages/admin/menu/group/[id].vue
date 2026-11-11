<script setup lang="ts">
// Обед для групп. Форма — components/AdminGroupMenuForm.vue
import type { AdminGroupMenus } from '#shared/group-menus'

definePageMeta({ layout: 'admin', access: ['menu'] })
defineI18nRoute(false)
useHead({ title: 'Обед для групп — Групповое меню — админка Peetri Toll' })

const route = useRoute()
const { data, error } = await useFetch<AdminGroupMenus>('/api/admin/group-menus')
</script>

<template>
  <div>
    <p v-if="error" class="adm-alert" role="alert">
      {{ apiErrorMessage(error, 'Не удалось загрузить меню.') }}
    </p>
    <AdminGroupMenuForm v-if="data" :data="data" :menu-id="Number(route.params.id)" />
  </div>
</template>
