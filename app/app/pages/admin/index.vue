<script setup lang="ts">
// Временная стартовая страница админки: проверка макета (шаг 0.4).
// Список заявок — срез «Заявки и лиды» (6.1, шаг 1.6).
definePageMeta({ layout: 'admin' })
useHead({ title: 'Заявки — админка Peetri Toll' })
</script>

<template>
  <div>
    <header class="adm-top">
      <div>
        <p class="adm-top__crumb">Работа</p>
        <h1 class="adm-top__title">Заявки</h1>
      </div>
      <div class="adm-top__actions">
        <NuxtLink class="adm-top__site" to="/" target="_blank">Открыть сайт</NuxtLink>
      </div>
    </header>

    <section class="adm-panel">
      <h2 class="adm-panel__title">Каркас админки</h2>
      <p>Макет перенесён из прототипа. Разделы появятся по срезам: первым — «Меню».</p>
    </section>
  </div>
</template>
