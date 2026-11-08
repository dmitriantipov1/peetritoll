<script setup lang="ts">
// Новое блюдо основного меню. После сохранения — переход в карточку блюда.
import type { AdminMenu } from '#shared/menu'

definePageMeta({ layout: 'admin', access: ['menu'] })
defineI18nRoute(false)
useHead({ title: 'Новое блюдо — админка Peetri Toll' })

const route = useRoute()
const { can } = useAdminUser()

// Без права «правит» новое блюдо не завести — в список
if (!can('menu', 'edit')) await navigateTo('/admin/menu', { replace: true })

const { data: menu, error } = await useFetch<AdminMenu>('/api/admin/menu')
const categoryId = Number(route.query.category) || undefined
</script>

<template>
  <div>
    <p v-if="error" class="adm-alert" role="alert">
      {{ apiErrorMessage(error, 'Не удалось загрузить меню.') }}
    </p>
    <AdminDishForm
      v-if="menu"
      :dish="null"
      :menu="menu"
      :can-edit="true"
      :category-id="categoryId"
    />
  </div>
</template>
