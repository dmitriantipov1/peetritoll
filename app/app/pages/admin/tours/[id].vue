<script setup lang="ts">
// Экскурсионная программа. Форма — components/AdminTourForm.vue
import type { AdminTour } from '#shared/tours'

definePageMeta({ layout: 'admin', access: ['tours'] })
defineI18nRoute(false)
useHead({ title: 'Программа — Экскурсии — админка Peetri Toll' })

const route = useRoute()
const { data, error } = await useFetch<AdminTour[]>('/api/admin/tours')
</script>

<template>
  <div>
    <p v-if="error" class="adm-alert" role="alert">
      {{ apiErrorMessage(error, 'Не удалось загрузить программы.') }}
    </p>
    <AdminTourForm v-if="data" :tours="data" :tour-id="Number(route.params.id)" />
  </div>
</template>
