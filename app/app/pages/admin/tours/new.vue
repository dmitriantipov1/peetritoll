<script setup lang="ts">
// Новая экскурсионная программа. Форма — components/AdminTourForm.vue
import type { AdminTour } from '#shared/tours'

definePageMeta({ layout: 'admin', access: ['tours'] })
defineI18nRoute(false)
useHead({ title: 'Новая программа — Экскурсии — админка Peetri Toll' })

const { can } = useAdminUser()
if (!can('tours', 'edit')) await navigateTo('/admin/tours', { replace: true })

const { data, error } = await useFetch<AdminTour[]>('/api/admin/tours')
</script>

<template>
  <div>
    <p v-if="error" class="adm-alert" role="alert">
      {{ apiErrorMessage(error, 'Не удалось загрузить программы.') }}
    </p>
    <AdminTourForm v-if="data" :tours="data" :tour-id="null" />
  </div>
</template>
