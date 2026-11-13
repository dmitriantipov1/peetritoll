<script setup lang="ts">
// «Устроителям путешествий» — групповое меню (group.html прототипа, ответы заказчицы 12.11.2026):
// раздел «Трапезы групп» с фото и фактами, ниже карточки обедов из базы. Калькулятора нет.
// Форма запроса группы — следующим слоем.
import type { SiteGroup } from '#shared/site-group'
import { formatPrice } from '#shared/money'

const { t, locale } = useI18n()
const localePath = useLocalePath()

useHead({ title: () => `${t('group.title')} — Tavern Peetri Toll` })

const { data: group, error } = await useFetch<SiteGroup>('/api/site/group', { query: { locale } })
if (error.value?.statusCode === 404) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

const minPrice = computed(() =>
  group.value?.menus.length ? Math.min(...group.value.menus.map((m) => m.priceCents)) : null,
)
// «за сутки» при 24 часах, иначе «за N ч»
const lead = computed(() =>
  group.value?.leadHours === 24
    ? t('group.leadDay')
    : t('group.leadHours', { n: group.value?.leadHours ?? 0 }),
)
</script>

<template>
  <div v-if="group">
    <PageHero
      :title="t('group.title')"
      image="/images/hero.jpg"
      :crumb="t('group.crumb')"
      :lead="t('group.heroLead')"
    />

    <!-- 01 Трапезы групп -->
    <section id="gruppam" class="section section--bg1">
      <div class="container">
        <SectionHead num="01" :crumb="t('group.crumb')" :title="t('group.sectionTitle')" />

        <div class="story">
          <div class="story__text">
            <h3 class="intro__title">{{ t('group.heroLead') }}</h3>
            <p>{{ t('group.text') }}</p>
            <dl class="facts">
              <div class="facts__row">
                <dt>{{ t('group.factWho') }}</dt>
                <dd>{{ t('group.factWhoText') }}</dd>
              </div>
              <div class="facts__row">
                <dt>{{ t('group.factGroup') }}</dt>
                <dd>{{ t('group.factGroupText', { n: group.minPeople, lead }) }}</dd>
              </div>
              <div v-if="minPrice !== null" class="facts__row">
                <dt>{{ t('group.factMenu') }}</dt>
                <dd>{{ t('group.factMenuText', { price: formatPrice(minPrice) }) }}</dd>
              </div>
              <div class="facts__row">
                <dt>{{ t('group.factPay') }}</dt>
                <dd>{{ t('group.factPayText') }}</dd>
              </div>
              <div class="facts__row">
                <dt>{{ t('group.factBanquet') }}</dt>
                <dd>
                  {{ t('group.factBanquetText') }}
                  <NuxtLink :to="localePath('/banquet')">{{ t('group.factBanquetLink') }}</NuxtLink>
                </dd>
              </div>
            </dl>
            <a v-if="group.menus.length" class="btn btn--red" href="#zakaz">{{
              t('group.pick')
            }}</a>
          </div>

          <figure class="story__media">
            <PhotoFrame src="/images/group-table.jpg" :alt="t('group.photoAlt')" />
            <figcaption class="quote story__quote story__quote--center">
              {{ t('group.caption') }}
            </figcaption>
          </figure>
        </div>
      </div>
    </section>

    <!-- 02 Выбрать обед -->
    <section id="zakaz" class="section section--bg2">
      <div class="container">
        <SectionHead num="02" :crumb="t('group.crumb')" :title="t('group.pickTitle')" />

        <ul v-if="group.menus.length" class="meal-cards" :aria-label="t('group.cards')">
          <li v-for="m in group.menus" :key="m.id" class="meal-card">
            <p class="meal-card__num">{{ t('group.menuNo', { n: m.number }) }}</p>
            <h3 class="meal-card__name">{{ m.name }}</h3>
            <ul v-if="m.items.length" class="meal-card__list">
              <li v-for="(item, i) in m.items" :key="i">{{ item }}</li>
            </ul>
            <p class="meal-card__price">
              <b>{{ formatPrice(m.priceCents) }}</b> {{ t('group.perPerson') }}
            </p>
          </li>
        </ul>
        <p v-else class="events-empty">{{ t('group.noMenus') }}</p>
      </div>
    </section>
  </div>
</template>
