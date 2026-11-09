<script setup lang="ts">
// Карточка сотрудника
import type { AdminStaff } from '#shared/staff'

definePageMeta({ layout: 'admin', access: ['staff'] })
defineI18nRoute(false)

const route = useRoute()
const { data: staff, error } = await useFetch<AdminStaff>(
  () => `/api/admin/staff/${route.params.id}`,
)

useHead({ title: () => `${staff.value?.name ?? 'Сотрудник'} — админка Peetri Toll` })

const saved = ref(false)
function onSaved(value: AdminStaff) {
  staff.value = value
  saved.value = true
  setTimeout(() => (saved.value = false), 3000)
}
</script>

<template>
  <div>
    <template v-if="error">
      <NuxtLink class="adm-back" to="/admin/staff">← Сотрудники</NuxtLink>
      <p class="adm-alert" role="alert">
        {{ apiErrorMessage(error, 'Не удалось загрузить сотрудника.') }}
      </p>
    </template>
    <p v-if="saved" class="adm-alert" role="status">Сохранено.</p>
    <AdminStaffForm v-if="staff" :staff="staff" @saved="onSaved" @updated="staff = $event" />
  </div>
</template>
