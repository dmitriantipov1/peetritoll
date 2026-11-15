<script setup lang="ts">
// Страница автора (author.html прототипа, перенесено как есть 15.11.2026): одна страница-шаблон
// на всех авторов из «Музея» — имя и род занятий настоящие, остальное пока заглушка, как в
// прототипе (рассказ, книги, работы, тексты подставит админка). Неизвестный автор — 404.
const route = useRoute()
const { t, locale } = useI18n()
const localePath = useLocalePath()

const author = museumAuthors.find((a) => a.slug === route.params.slug)
if (!author) throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })

const name = computed(() => t(`museum.authors.items.${author.slug}.name`))
useHead({ title: () => `${name.value} — Tavern Peetri Toll` })

// Раздел «Музей» выключен в настройках сайта — страницы нет
const { error: sectionOff } = await useFetch('/api/site/museum', { query: { locale } })
if (sectionOff.value?.statusCode === 404) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

const books = [1, 2, 3] as const
const works = [1, 2, 3, 4] as const
</script>

<template>
  <div>
    <section class="page-hero">
      <img class="hero__bg" src="/images/weapons-2.jpg" alt="" />
      <div class="container page-hero__content">
        <p class="page-hero__crumb">
          <NuxtLink :to="localePath('/')">{{ t('nav.home') }}</NuxtLink> /
          <NuxtLink :to="localePath('/museum')">{{ t('nav.museum') }}</NuxtLink> /
          <NuxtLink :to="localePath('/museum') + '#avtory'">{{
            t('museum.authors.title')
          }}</NuxtLink>
        </p>
        <h1 class="page-hero__title">{{ name }}</h1>
        <p class="page-hero__lead">{{ t(`museum.authors.items.${author.slug}.role`) }}</p>
      </div>
    </section>

    <!-- 01 Об авторе -->
    <section id="ob-avtore" class="section section--bg1">
      <div class="container">
        <SectionHead
          num="01"
          :crumb="t('museum.authors.crumb')"
          :title="t('author.about')"
          :more="{ to: localePath('/museum') + '#avtory', label: t('author.all') }"
        />
        <div class="story">
          <div class="story__text">
            <h3 class="intro__title">{{ t('author.lead') }}</h3>
            <p>{{ t(`museum.authors.items.${author.slug}.text`) }}</p>
            <p>{{ t('author.text2') }}</p>
            <dl class="facts">
              <div v-for="f in ['who', 'works', 'langs'] as const" :key="f" class="facts__row">
                <dt>{{ t(`author.facts.${f}.title`) }}</dt>
                <dd>{{ t(`author.facts.${f}.text`) }}</dd>
              </div>
            </dl>
          </div>
          <figure class="story__media">
            <PhotoFrame :src="author.photo" :alt="name" />
            <figcaption class="quote story__quote">
              {{ t('author.quote1') }}<br /><span class="quote__indent">{{
                t('author.quote2')
              }}</span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>

    <!-- 02 Книги -->
    <section id="knigi" class="section section--bg2">
      <div class="container">
        <SectionHead
          num="02"
          :crumb="t('author.booksCrumb')"
          :title="t('author.books')"
          :more="{ to: 'https://peetritoll.sumupstore.com/tooted', label: t('museum.books.all') }"
        />
        <ul class="cards cards--5">
          <li v-for="b in books" :key="b" class="card">
            <div class="card__img">
              <PhotoFrame :src="`/images/author-book-${b}.jpg`" :alt="t('author.bookAlt')" />
            </div>
            <h4 class="card__title">{{ t(`author.book${b}.title`) }}</h4>
            <p class="card__meta">{{ t(`author.book${b}.meta`) }}</p>
            <p class="card__desc">{{ t(`author.book${b}.desc`) }}</p>
            <p class="card__price">0,00 €</p>
            <a
              class="btn btn--sm"
              href="https://peetritoll.sumupstore.com/tooted"
              target="_blank"
              rel="noopener"
              >{{ t('museum.books.buy') }}</a
            >
          </li>
        </ul>
      </div>
    </section>

    <!-- 03 Работы -->
    <section id="raboty" class="section section--bg1">
      <div class="container">
        <SectionHead num="03" :crumb="t('author.worksCrumb')" :title="t('author.worksTitle')" />
        <div class="intro intro--single">
          <h3 class="intro__title">{{ t('author.galleryTitle') }}</h3>
          <p>{{ t('author.galleryText') }}</p>
        </div>
        <ul class="gallery">
          <li v-for="w in works" :key="w">
            <PhotoFrame :src="`/images/author-work-${w}.jpg`" :alt="t('author.workAlt')" />
          </li>
        </ul>
      </div>
    </section>

    <!-- 04 Тексты -->
    <section id="teksty" class="section section--bg2">
      <div class="container">
        <SectionHead num="04" :crumb="t('author.textsCrumb')" :title="t('author.texts')" />
        <ul class="grid-2">
          <li v-for="x in [1, 2] as const" :key="x" class="review">
            <p class="review__text">{{ t(`author.excerpt${x}`) }}</p>
            <p class="review__source">{{ t('author.excerptSource') }}</p>
          </li>
        </ul>
        <div class="cta-row">
          <p class="quote">
            {{ t('author.shopQuote1') }}<br /><span class="quote__indent">{{
              t('author.shopQuote2')
            }}</span>
          </p>
          <a
            class="btn btn--red"
            href="https://peetritoll.sumupstore.com/tooted"
            target="_blank"
            rel="noopener"
            >{{ t('author.toShop') }}</a
          >
        </div>
      </div>
    </section>
  </div>
</template>
