<script setup lang="ts">
// Групповое меню — каталог для калькулятора на сайте (7.1). Вся страница — components/AdminCatalogPage.vue
definePageMeta({ layout: 'admin', access: ['menu'] })
defineI18nRoute(false)
useHead({ title: 'Групповое меню — админка Peetri Toll' })
</script>

<template>
  <AdminCatalogPage kind="group" />
</template>
