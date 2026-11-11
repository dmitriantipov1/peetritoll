<script setup lang="ts">
// Новый обед для групп. Форма — components/AdminGroupMenuForm.vue
import type { AdminGroupMenus } from '#shared/group-menus'

definePageMeta({ layout: 'admin', access: ['menu'] })
defineI18nRoute(false)
useHead({ title: 'Новый обед — Групповое меню — админка Peetri Toll' })

const { can } = useAdminUser()
if (!can('menu', 'edit')) await navigateTo('/admin/menu/group', { replace: true })

const { data, error } = await useFetch<AdminGroupMenus>('/api/admin/group-menus')
</script>

<template>
  <div>
    <p v-if="error" class="adm-alert" role="alert">
      {{ apiErrorMessage(error, 'Не удалось загрузить меню.') }}
    </p>
    <AdminGroupMenuForm v-if="data" :data="data" :menu-id="null" />
  </div>
</template>
