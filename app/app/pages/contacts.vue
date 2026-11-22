<script setup lang="ts">
// «Контакты» (contacts.html прототипа): адрес и связь, часы работы с особыми днями, как добраться.
// Адрес, телефон, часы и особые дни — из админки «Контакты и часы», тот же запрос, что у подвала.
// «Написать нам» — components/ContactForm.vue: письмо сотрудникам, не заявка.
// Карты пока нет — заглушка map.jpg и ссылка «Открыть на карте» (встроенная карта Google
// ставит свои cookies — только после баннера согласия, 8.1).
import { phoneDigits } from '#shared/site-contacts'

const { t, locale } = useI18n()

useHead({ title: () => `${t('contacts.title')} — Tavern Peetri Toll` })

const { data: c } = await useSiteContacts()

// Даты без часового пояса браузера: «2026-12-24» — это день по Таллину
const asDate = (d: string) => new Date(`${d}T00:00:00Z`)
const fmt = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(locale.value, { ...options, timeZone: 'UTC' })

const hoursRows = useHoursRows(() => c.value?.week)

/** «Как добраться»: какие плитки раскрыты целиком (22.11.2026) */
const roadOpen = reactive({ car: false, train: false, bus: false })

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

    <!-- 01 Контакты. Тексты страницы — заказчицы, 21.11.2026 -->
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

    <!-- 02 Расписание -->
    <section id="chasy" class="section section--bg2">
      <div class="container">
        <SectionHead num="02" :crumb="t('contacts.hoursCrumb')" :title="t('contacts.hoursTitle')" />

        <!-- Текст во всю колонку, до блока особых дней (заказчица, 22.11.2026) -->
        <div class="intro intro--wide" :class="{ 'intro--single': !c.specialDays.length }">
          <div class="intro__text">
            <h3 class="intro__title">{{ t('contacts.hoursLead') }}</h3>
            <p>{{ t('contacts.hoursText') }}</p>
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
            <!-- Золотая полоска сверху, а не сбоку (заказчица, 21.11.2026) -->
            <div class="note note--top">
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

    <!-- 03 Из Таллина в Палдиски -->
    <section id="doroga" class="section section--bg1">
      <div class="container">
        <SectionHead num="03" :crumb="t('contacts.roadCrumb')" :title="t('contacts.roadTitle')" />

        <!-- Видно по первому абзацу, остальное — «Показать полностью» (заказчица, 22.11.2026) -->
        <ul class="grid-3">
          <li class="tile" :class="{ 'is-open': roadOpen.car }">
            <h4 class="tile__title">{{ t('contacts.byCar') }}</h4>
            <p class="tile__text">{{ t('contacts.byCarText') }}</p>
            <div id="doroga-car" class="tile__rest">
              <div>
                <p class="tile__text">{{ t('contacts.byCarText2') }}</p>
              </div>
            </div>
            <button
              class="tile__toggle"
              type="button"
              aria-controls="doroga-car"
              :aria-expanded="roadOpen.car"
              @click="roadOpen.car = !roadOpen.car"
            >
              {{ roadOpen.car ? t('contacts.showLess') : t('contacts.showMore') }}
            </button>
          </li>
          <li class="tile" :class="{ 'is-open': roadOpen.train }">
            <h4 class="tile__title">{{ t('contacts.byTrain') }}</h4>
            <p class="tile__text">{{ t('contacts.byTrainText') }}</p>
            <div id="doroga-train" class="tile__rest">
              <div>
                <p class="tile__text">
                  {{ t('contacts.byTrainMore') }}
                  <a href="https://elron.ee" target="_blank" rel="noopener">elron.ee</a>.
                </p>
                <p class="tile__text">{{ t('contacts.byTrainText2') }}</p>
              </div>
            </div>
            <button
              class="tile__toggle"
              type="button"
              aria-controls="doroga-train"
              :aria-expanded="roadOpen.train"
              @click="roadOpen.train = !roadOpen.train"
            >
              {{ roadOpen.train ? t('contacts.showLess') : t('contacts.showMore') }}
            </button>
          </li>
          <li class="tile" :class="{ 'is-open': roadOpen.bus }">
            <h4 class="tile__title">{{ t('contacts.byBus') }}</h4>
            <p class="tile__text">
              {{ t('contacts.byBusText') }}
              <a
                href="https://transport.tallinn.ee/mobile.html#harju/regionalbus/145"
                target="_blank"
                rel="noopener"
                >{{ t('contacts.byBusSchedule') }}</a
              >.
            </p>
            <div id="doroga-bus" class="tile__rest">
              <div>
                <p class="tile__text">{{ t('contacts.byBusText2') }}</p>
              </div>
            </div>
            <button
              class="tile__toggle"
              type="button"
              aria-controls="doroga-bus"
              :aria-expanded="roadOpen.bus"
              @click="roadOpen.bus = !roadOpen.bus"
            >
              {{ roadOpen.bus ? t('contacts.showLess') : t('contacts.showMore') }}
            </button>
          </li>
        </ul>
      </div>
    </section>

    <!-- 04 Написать нам -->
    <section id="napisat" class="section section--bg2">
      <div class="container">
        <SectionHead num="04" :crumb="t('contacts.writeCrumb')" :title="t('contacts.writeTitle')" />

        <div class="two-col">
          <div class="prose">
            <h3 class="intro__title">{{ t('contacts.writeLead') }}</h3>
            <p>{{ t('contacts.writeText') }}</p>
            <p class="quote">
              {{ t('contacts.writeQuote1') }}<br /><span class="quote__indent">{{
                t('contacts.writeQuote2')
              }}</span>
            </p>
          </div>
          <ContactForm />
        </div>
      </div>
    </section>
  </div>
</template>
