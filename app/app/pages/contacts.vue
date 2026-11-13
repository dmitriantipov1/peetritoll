<script setup lang="ts">
// «Контакты» (contacts.html прототипа): адрес и связь, часы работы с особыми днями, как добраться.
// Адрес, телефон, часы и особые дни — из админки «Контакты и часы», тот же запрос, что у подвала.
// Карты пока нет — заглушка map.jpg и ссылка «Открыть на карте» (встроенная карта Google
// ставит свои cookies — только после баннера согласия, 8.1).
import { groupWeek } from '#shared/contacts'
import { phoneDigits } from '#shared/site-contacts'

const { t, locale } = useI18n()
const localePath = useLocalePath()

useHead({ title: () => `${t('contacts.title')} — Tavern Peetri Toll` })

const { data: c } = await useSiteContacts()

// Даты без часового пояса браузера: «2026-12-24» — это день по Таллину
const asDate = (d: string) => new Date(`${d}T00:00:00Z`)
const fmt = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale.value, { ...options, timeZone: 'UTC' })

// 9 ноября 2026 — понедельник: от него берём названия дней недели на языке страницы
const dayName = (i: number) => {
  const name = fmt({ weekday: 'short' }).format(asDate(`2026-11-${String(9 + i).padStart(2, '0')}`))
  return name.replace('.', '')
}
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const hoursRows = computed(() =>
  groupWeek(c.value?.week ?? []).map(({ first, last, hours }) => ({
    days: capital(first === last ? dayName(first) : `${dayName(first)} — ${dayName(last)}`),
    text: hours.open ? `${hours.from} — ${hours.to}` : t('contacts.closed'),
  })),
)
const everyDay = computed(() => c.value?.week.every((d) => d.open) ?? false)

const specialDate = (d: string) => fmt({ day: 'numeric', month: 'long' }).format(asDate(d))

const social = computed(() =>
  [
    { label: 'Facebook', href: c.value?.facebook },
    { label: 'TripAdvisor', href: c.value?.tripadvisor },
    { label: 'Foursquare', href: c.value?.foursquare },
  ].filter((s) => s.href),
)
</script>

<template>
  <div v-if="c">
    <PageHero
      :title="t('contacts.title')"
      image="/images/restaurant-house.jpg"
      :crumb="t('contacts.title')"
      :lead="t('contacts.heroLead')"
    />

    <!-- 01 Как нас найти -->
    <section id="adres" class="section section--bg1">
      <div class="container">
        <SectionHead num="01" :crumb="t('contacts.findCrumb')" :title="t('contacts.findTitle')" />

        <div class="story">
          <div class="story__text">
            <h3 class="intro__title">{{ t('contacts.findLead') }}</h3>
            <p>{{ t('contacts.findText') }}</p>
            <dl class="facts">
              <div v-if="c.address" class="facts__row">
                <dt>{{ t('contacts.address') }}</dt>
                <dd>{{ c.address }}, {{ t('contacts.country') }}</dd>
              </div>
              <div v-if="c.phone" class="facts__row">
                <dt>{{ t('contacts.phone') }}</dt>
                <dd>
                  <a :href="`tel:${phoneDigits(c.phone)}`">{{ c.phone }}</a>
                </dd>
              </div>
              <div v-if="c.whatsapp" class="facts__row">
                <dt>{{ t('contacts.whatsapp') }}</dt>
                <dd>
                  <a
                    :href="`https://wa.me/${phoneDigits(c.whatsapp).replace('+', '')}`"
                    target="_blank"
                    rel="noopener"
                    >{{ c.whatsapp }}</a
                  >
                </dd>
              </div>
              <div v-if="c.email" class="facts__row">
                <dt>{{ t('contacts.email') }}</dt>
                <dd>
                  <a :href="`mailto:${c.email}`">{{ c.email }}</a>
                </dd>
              </div>
              <div v-if="social.length" class="facts__row">
                <dt>{{ t('contacts.social') }}</dt>
                <dd>
                  <template v-for="(s, i) in social" :key="s.label">
                    <template v-if="i"> · </template>
                    <a :href="s.href" target="_blank" rel="noopener">{{ s.label }}</a>
                  </template>
                </dd>
              </div>
            </dl>
            <a v-if="c.mapUrl" class="btn" :href="c.mapUrl" target="_blank" rel="noopener">{{
              t('contacts.openMap')
            }}</a>
          </div>

          <figure class="story__media">
            <PhotoFrame src="/images/map.jpg" :alt="t('contacts.mapAlt')" />
            <figcaption class="quote story__quote">
              {{ t('contacts.mapCaption1') }}<br /><span class="quote__indent">{{
                t('contacts.mapCaption2')
              }}</span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>

    <!-- 02 Часы работы -->
    <section id="chasy" class="section section--bg2">
      <div class="container">
        <SectionHead num="02" :crumb="t('contacts.hoursCrumb')" :title="t('contacts.hoursTitle')" />

        <div class="intro" :class="{ 'intro--single': !c.specialDays.length }">
          <div class="intro__text">
            <h3 class="intro__title">
              {{ everyDay ? t('contacts.hoursLeadDaily') : t('contacts.hoursLead') }}
            </h3>
            <dl class="facts">
              <div v-for="r in hoursRows" :key="r.days" class="facts__row">
                <dt>{{ r.days }}</dt>
                <dd>{{ r.text }}</dd>
              </div>
              <div class="facts__row">
                <dt>{{ t('contacts.museum') }}</dt>
                <dd>{{ t('contacts.museumText') }}</dd>
              </div>
            </dl>
          </div>
          <div v-if="c.specialDays.length" class="intro__aside">
            <div class="note">
              <p class="note__title">{{ t('contacts.special') }}</p>
              <dl class="facts facts--compact">
                <div v-for="d in c.specialDays" :key="d.date" class="facts__row">
                  <dt>{{ specialDate(d.date) }}</dt>
                  <dd>
                    <template v-if="d.label">{{ d.label }} — </template
                    >{{ d.open ? `${d.from} — ${d.to}` : t('contacts.closedDay') }}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 03 Как добраться -->
    <section id="doroga" class="section section--bg1">
      <div class="container">
        <SectionHead num="03" :crumb="t('contacts.roadCrumb')" :title="t('contacts.roadTitle')" />

        <ul class="grid-3">
          <li class="tile">
            <h4 class="tile__title">{{ t('contacts.byCar') }}</h4>
            <p class="tile__text">{{ t('contacts.byCarText') }}</p>
          </li>
          <li class="tile">
            <h4 class="tile__title">{{ t('contacts.byTrain') }}</h4>
            <p class="tile__text">{{ t('contacts.byTrainText') }}</p>
          </li>
          <li class="tile">
            <h4 class="tile__title">{{ t('contacts.byGroup') }}</h4>
            <p class="tile__text">
              {{ t('contacts.byGroupText') }}
              <NuxtLink :to="localePath('/group') + '#zayavka'">{{
                t('contacts.byGroupLink')
              }}</NuxtLink
              >.
            </p>
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>
