<script setup lang="ts">
// Заголовок раздела: надзаголовок, номер золотом и название, ссылка справа, линия снизу.
// Классы .section-head из прототипа.
defineProps<{
  title: string
  num?: string
  crumb?: string
  more?: { to: string; label: string }
}>()
</script>

<template>
  <header class="section-head">
    <p v-if="crumb" class="section-head__crumb">{{ crumb }}</p>
    <h2 class="section-head__title">
      <span v-if="num" class="section-head__num">{{ num }}</span> {{ title }}
    </h2>
    <NuxtLink v-if="more" class="section-head__more" :to="more.to">{{ more.label }}</NuxtLink>
  </header>
</template>
