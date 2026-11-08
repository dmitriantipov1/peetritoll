<script setup lang="ts">
// Шапка внутренней страницы: фото фоном, «хлебные крошки», заголовок, подзаголовок.
// Классы .page-hero из прототипа (например, menu.html).
defineProps<{
  title: string
  image: string
  crumb?: string
  lead?: string
}>()
</script>

<template>
  <section class="page-hero">
    <img class="hero__bg" :src="image" alt="" />
    <div class="container page-hero__content">
      <p class="page-hero__crumb">
        <NuxtLink to="/">Главная</NuxtLink>
        <template v-if="crumb"> / {{ crumb }}</template>
      </p>
      <h1 class="page-hero__title">{{ title }}</h1>
      <p v-if="lead" class="page-hero__lead">{{ lead }}</p>
    </div>
  </section>
</template>
