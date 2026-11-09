<script setup lang="ts">
// Новый сотрудник. После сохранения — в его карточку
definePageMeta({ layout: 'admin', access: ['staff'] })
defineI18nRoute(false)

const { can } = useAdminUser()
if (!can('staff', 'edit')) await navigateTo('/admin/staff', { replace: true })

useHead({ title: 'Новый сотрудник — админка Peetri Toll' })
</script>

<template>
  <AdminStaffForm :staff="null" />
</template>
