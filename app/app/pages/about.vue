<script setup lang="ts">
// «О нас» (about.html прототипа, перенесено как есть 15.11.2026): 01 семейное дело, 02 история
// здания, 03 история Палдиски, 04 новости (три свежие из базы; раздел «Новости» выключен
// или новостей нет — блока нет, номера сдвигаются), 05 спонсоры и партнёры с логотипами
// и фото владелицы. Тексты — в переводах (пока только русские); 01–03 — тексты и фото
// от заказчицы (15.11.2026), «Заглянуть в книгу» — в магазин.
import type { SiteNewsCard } from '#shared/site-news'

const { t, te, locale } = useI18n()
const localePath = useLocalePath()

useHead({ title: () => `${t('about.title')} — Tavern Peetri Toll` })

// Новости — не обязательны: раздел выключен (404) — просто без блока
const { data: news } = await useFetch<SiteNewsCard[]>('/api/site/news', {
  query: { locale },
  default: () => [],
})
const latest = computed(() => (news.value ?? []).slice(0, 3))
const partnersNum = computed(() => (latest.value.length ? '05' : '04'))

const timeline = ['xviii', 'xix', 'xx', 'xxi'] as const
// «Заглянуть в книгу» — «Байки из-за барной стойки» в нашем магазине: в русской версии —
// русское издание, в эстонской — эстонское («Lood baarileti tagant»). Английского нет — без кнопки
const bookSlugs: Partial<Record<string, string>> = {
  ru: 'bayki-iz-za-barnoy-stoyki',
  et: 'lood-baarileti-tagant',
}
const bookSlug = computed(() => bookSlugs[locale.value])
// Сноска под фото здания (15.11.2026) — книга Пауля Лаана: русское издание «Мой родной Палдиски»,
// эстонское — «Kodulinn Paldiski». Английского нет — без кнопки
const laanSlugs: Partial<Record<string, string>> = {
  ru: 'moy-rodnoy-paldiski',
  et: 'kodulinn-paldiski',
}
const laanSlug = computed(() => laanSlugs[locale.value])
// Сноска под гравюрой в «03» (16.11.2026) — книга Йосефа Каца «Былой Палдиски и его люди»,
// есть только русское издание
const katsSlugs: Partial<Record<string, string>> = { ru: 'byloy-paldiski-i-ego-lyudi' }
const katsSlug = computed(() => katsSlugs[locale.value])
// Логотипы — в порядке заказчицы (13.11.2026); на телефоне — лентой, плывёт сама
const logos = ref<HTMLElement | null>(null)
useAutoSlide(logos)
// Логотипы — в порядке заказчицы (13.11.2026)
const partners = [
  { file: '01-laane-harju-vald.png', alt: 'Lääne-Harju vald', w: 460, h: 200 },
  {
    file: '02-tuuleenergia-toetab.png',
    alt: 'Tuuleenergia toetab — MTÜ Paldiski Linna Toetusgrupp',
    w: 373,
    h: 200,
  },
  { file: '03-laane-harju-koostookogu.png', alt: 'Lääne-Harju Koostöökogu', w: 574, h: 123 },
  { file: '04-eesti-kultuurkapital.png', alt: 'Eesti Kultuurkapital', w: 446, h: 200 },
  { file: '05-leader.png', alt: 'LEADER Eesti', w: 382, h: 123 },
  { file: '06-derivaat-nh3.png', alt: 'Derivaat NH3', w: 842, h: 200 },
  { file: '07-uus-laine.png', alt: 'Uus Laine', w: 458, h: 200 },
]
</script>

<template>
  <div>
    <PageHero
      :title="t('about.title')"
      image="/images/hero.jpg"
      :crumb="t('about.title')"
      :lead="t('about.heroLead')"
    />

    <!-- 01 Семейное дело -->
    <section id="semya" class="section section--bg1">
      <div class="container">
        <SectionHead num="01" :crumb="t('about.family.crumb')" :title="t('about.family.title')" />
        <div class="story story--sticky">
          <div class="story__text">
            <h3 class="intro__title">{{ t('about.family.lead') }}</h3>
            <p>{{ t('about.family.text1') }}</p>
            <p>{{ t('about.family.text2') }}</p>
            <p>{{ t('about.family.text3') }}</p>
            <p>
              <strong>{{ t('about.family.factLabel') }}</strong> {{ t('about.family.fact') }}
            </p>
            <NuxtLink v-if="bookSlug" class="btn" :to="localePath(`/shop/${bookSlug}`)">{{
              t('about.family.book')
            }}</NuxtLink>
          </div>
          <figure class="story__media">
            <PhotoFrame src="/images/about-family.jpg" :alt="t('about.family.photoAlt')" />
            <figcaption class="quote story__quote story__quote--flush">
              {{ t('about.family.quote1') }}<br /><span class="quote__indent">{{
                t('about.family.quote2')
              }}</span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>

    <!-- 02 История здания -->
    <section id="zdanie" class="section section--bg2">
      <div class="container">
        <SectionHead
          num="02"
          :crumb="t('about.building.crumb')"
          :title="t('about.building.title')"
        />
        <div class="story story--sticky">
          <div class="story__text">
            <ol class="timeline">
              <li v-for="step in timeline" :key="step">
                <p class="timeline__date">{{ t(`about.building.timeline.${step}.date`) }}</p>
                <p class="timeline__text">{{ t(`about.building.timeline.${step}.text`) }}</p>
                <p v-if="te(`about.building.timeline.${step}.text2`)" class="timeline__text">
                  {{ t(`about.building.timeline.${step}.text2`) }}
                </p>
              </li>
            </ol>
          </div>
          <figure class="story__media">
            <PhotoFrame src="/images/about-building.jpg" :alt="t('about.building.photoAlt')" />
            <figcaption class="quote story__quote story__quote--flush">
              {{ t('about.building.quote1') }}<br /><span class="quote__indent">{{
                t('about.building.quote2')
              }}</span>
            </figcaption>
            <div v-if="te('about.building.book.text')" class="note story__note story__note--light">
              <p>
                <strong>{{ t('about.building.book.lead') }}</strong>
                {{ t('about.building.book.text') }}
              </p>
            </div>
            <p v-if="laanSlug && te('about.building.book.text')" class="story__more">
              <NuxtLink class="btn" :to="localePath(`/shop/${laanSlug}`)">{{
                t('about.family.book')
              }}</NuxtLink>
            </p>
          </figure>
        </div>
      </div>
    </section>

    <!-- 03 История Палдиски -->
    <section id="paldiski" class="section section--bg1">
      <div class="container">
        <SectionHead num="03" :crumb="t('about.city.crumb')" :title="t('about.city.title')" />
        <div class="story story--sticky">
          <div class="story__text">
            <h3 class="intro__title">{{ t('about.city.lead') }}</h3>
            <p>{{ t('about.city.text1') }}</p>
            <p>{{ t('about.city.text2') }}</p>
            <p>{{ t('about.city.text3') }}</p>
          </div>
          <figure class="story__media">
            <PhotoFrame src="/images/paldiski-history.jpg" :alt="t('about.city.photoAlt')" />
            <figcaption class="quote story__quote story__quote--flush">
              {{ t('about.city.quote1') }}<br /><span class="quote__indent">{{
                t('about.city.quote2')
              }}</span>
            </figcaption>
            <div v-if="te('about.city.book.text')" class="note story__note story__note--mid">
              <p>
                <strong>{{ t('about.city.book.lead') }}</strong> {{ t('about.city.book.text') }}
              </p>
            </div>
            <p v-if="katsSlug && te('about.city.book.text')" class="story__more">
              <NuxtLink class="btn" :to="localePath(`/shop/${katsSlug}`)">{{
                t('about.family.book')
              }}</NuxtLink>
            </p>
          </figure>
        </div>
      </div>
    </section>

    <!-- 04 Новости — из базы -->
    <section v-if="latest.length" id="novosti" class="section section--bg2">
      <div class="container">
        <SectionHead
          num="04"
          :crumb="t('news.crumb')"
          :title="t('news.title')"
          :more="{ to: localePath('/news'), label: t('news.allNews') }"
        />
        <ul class="grid-3 news">
          <NewsCard v-for="n in latest" :key="n.id" :item="n" />
        </ul>
      </div>
    </section>

    <!-- 05 Спонсоры и партнёры -->
    <section id="partnery" class="section section--bg1">
      <div class="container">
        <SectionHead
          :num="partnersNum"
          :crumb="t('about.partners.crumb')"
          :title="t('about.partners.title')"
        />
        <div class="intro intro--half">
          <div class="intro__text">
            <h3 class="intro__title">{{ t('about.partners.lead') }}</h3>
            <p>{{ t('about.partners.text1') }}</p>
            <p>{{ t('about.partners.text2') }}</p>
            <p>{{ t('about.partners.text3') }}</p>
          </div>
          <figure class="intro__photo">
            <PhotoFrame src="/images/owner.jpg" :alt="t('about.partners.ownerAlt')" />
          </figure>
        </div>
        <ul ref="logos" class="partners partners--logos" :aria-label="t('about.partners.crumb')">
          <li v-for="p in partners" :key="p.file">
            <img
              :src="`/images/partners/${p.file}`"
              :alt="p.alt"
              :width="p.w"
              :height="p.h"
              loading="lazy"
            />
          </li>
          <!-- копия для ленты на телефоне: плывёт по кругу без скачка; на компьютере скрыта -->
          <li v-for="p in partners" :key="`copy-${p.file}`" data-clone aria-hidden="true">
            <img
              :src="`/images/partners/${p.file}`"
              alt=""
              :width="p.w"
              :height="p.h"
              loading="lazy"
            />
          </li>
        </ul>
      </div>
    </section>
  </div>
</template>
