<script setup lang="ts">
// «Пиршества и застолья» — банкетное меню (banquet.html прототипа): 01 оружейный зал (вместимость
// и срок запроса — из настроек банкета), 02 как забронировать, 03 калькулятор
// (components/BanquetCalc.vue). Раздел «Запрос на банкет» выключен — 404.
import type { SiteBanquet } from '#shared/site-banquet'

const { t, locale } = useI18n()

useHead({ title: () => `${t('banquet.title')} — Tavern Peetri Toll` })

const { data: banquet, error } = await useFetch<SiteBanquet>('/api/site/banquet', {
  query: { locale },
})
if (error.value?.statusCode === 404) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

const { data: contacts } = await useSiteContacts()
const steps = [1, 2, 3] as const
</script>

<template>
  <div v-if="banquet">
    <PageHero
      :title="t('banquet.title')"
      image="/images/banquet-hall.jpg"
      :crumb="t('nav.sub.banquet.title')"
      :lead="t('banquet.heroLead')"
    />

    <!-- 01 Оружейный зал -->
    <section id="zal" class="section section--bg1">
      <div class="container">
        <SectionHead num="01" :crumb="t('banquet.hall.crumb')" :title="t('banquet.hall.title')" />

        <div class="story">
          <div class="story__text">
            <h3 class="intro__title">{{ t('banquet.hall.lead') }}</h3>
            <p class="lead-note">{{ t('banquet.hall.occasions') }}</p>
            <p>{{ t('banquet.hall.text') }}</p>
            <dl class="facts">
              <div class="facts__row">
                <dt>{{ t('banquet.hall.where') }}</dt>
                <dd>
                  {{ t('banquet.hall.whereText')
                  }}<template v-if="contacts?.address">, {{ contacts.address }}</template>
                </dd>
              </div>
              <div class="facts__row">
                <dt>{{ t('banquet.hall.guests') }}</dt>
                <dd>
                  {{
                    t('banquet.hall.guestsText', {
                      min: banquet.capacityMin,
                      max: banquet.capacityMax,
                    })
                  }}
                </dd>
              </div>
              <div class="facts__row">
                <dt>{{ t('banquet.hall.menu') }}</dt>
                <dd>{{ t('banquet.hall.menuText') }}</dd>
              </div>
              <div v-if="banquet.leadDays" class="facts__row">
                <dt>{{ t('banquet.hall.lead2') }}</dt>
                <dd>{{ t('banquet.hall.leadText', { n: banquet.leadDays }) }}</dd>
              </div>
              <div class="facts__row">
                <dt>{{ t('banquet.hall.prepay') }}</dt>
                <dd>{{ t('banquet.hall.prepayText') }}</dd>
              </div>
            </dl>
            <a class="btn btn--red" href="#zapros">{{ t('banquet.hall.calc') }}</a>
          </div>

          <figure class="story__media">
            <PhotoFrame src="/images/banquet-hall.jpg" :alt="t('banquet.hall.photoAlt')" />
            <figcaption class="quote story__quote">
              {{ t('banquet.hall.quote1') }}<br /><span class="quote__indent">{{
                t('banquet.hall.quote2')
              }}</span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>

    <!-- 02 Как забронировать -->
    <section id="kak" class="section section--bg2">
      <div class="container">
        <SectionHead num="02" :crumb="t('banquet.how.crumb')" :title="t('banquet.how.title')" />
        <ol class="grid-3 bq-how">
          <li v-for="n in steps" :key="n" class="tile">
            <p class="bq-how__num">{{ n }}</p>
            <h4 class="tile__title">{{ t(`banquet.how.s${n}.title`) }}</h4>
            <p class="tile__text">{{ t(`banquet.how.s${n}.text`) }}</p>
          </li>
        </ol>
      </div>
    </section>

    <!-- 03 Калькулятор -->
    <section id="zapros" class="section section--bg1">
      <div class="container">
        <SectionHead num="03" :crumb="t('banquet.calc.crumb')" :title="t('banquet.calc.title')" />
        <p class="lead-note">{{ t('banquet.calc.lead') }}</p>
        <BanquetCalc :banquet="banquet" />
      </div>
    </section>
  </div>
</template>
