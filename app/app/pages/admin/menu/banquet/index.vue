<script setup lang="ts">
// Банкетное меню — каталог для калькулятора на сайте (7.1). Вся страница — components/AdminCatalogPage.vue
definePageMeta({ layout: 'admin', access: ['menu'] })
defineI18nRoute(false)
useHead({ title: 'Банкетное меню — админка Peetri Toll' })
</script>

<template>
  <AdminCatalogPage kind="banquet" />
</template>
