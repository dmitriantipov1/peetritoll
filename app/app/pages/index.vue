<script setup lang="ts">
// Временная главная: проверка, что дизайн прототипа перенесён (шаг 0.4).
// Настоящий лендинг собирается из срезов (6.1).
useHead({ title: 'Tavern Peetri Toll — ресторан и музей в Палдиски' })
</script>

<template>
  <div>
    <PageHero
      title="Peetri Toll"
      image="/images/restaurant-hall.jpg"
      crumb="Приложение"
      lead="Перенос дизайна из прототипа: шапка, подвал, заголовки разделов"
    />

    <section class="section section--bg1">
      <div class="container">
        <SectionHead
          crumb="Шаг 0 «Основа»"
          num="01"
          title="Каркас приложения"
          :more="{ to: '/admin', label: 'Админка' }"
        />
        <p>
          Страницы сайта появятся по срезам: первым — меню ресторана.
          <a href="/api/health">Проверка приложения и базы</a>.
        </p>
      </div>
    </section>

    <section class="section section--bg2">
      <div class="container">
        <SectionHead num="02" title="Чередование фонов" crumb="section--bg2" />
        <p>Второй раздел — на втором фоне, как на страницах прототипа.</p>
      </div>
    </section>
  </div>
</template>
