<script setup lang="ts">
// Главная, «04 Магазин»: категории магазина и книги издательства — из базы (index.html прототипа).
// Карточка товара — вариант 8 (выбор заказчицы 10.11.2026), как .product в прототипе.
import type { HomeData } from '#shared/home'
import { formatPrice } from '#shared/money'

defineProps<{ shop: NonNullable<HomeData['shop']> }>()

const { t } = useI18n()
const localePath = useLocalePath()
const shopPath = computed(() => localePath('/shop'))
</script>

<template>
  <section id="magazin" class="section section--shop">
    <div class="container">
      <SectionHead
        num="04"
        :crumb="t('home.shop.crumb')"
        :title="t('home.shop.title')"
        :more="{ to: shopPath, label: t('home.shop.more') }"
      />

      <div class="intro intro--single">
        <h3 class="intro__title">{{ t('home.shop.lead') }}</h3>
        <p>{{ t('home.shop.text') }}</p>
      </div>

      <ul v-if="shop.categories.length" class="explore">
        <li v-for="c in shop.categories" :key="c.slug">
          <NuxtLink class="explore__link" :to="`${shopPath}#${c.slug}`">
            <span class="explore__title">{{ c.name }}</span>
          </NuxtLink>
        </li>
      </ul>

      <div v-if="shop.books.length" id="knigi" class="subsection">
        <div class="subsection__head">
          <h3 class="h3">{{ t('home.shop.books') }}</h3>
          <NuxtLink class="link-more" :to="`${shopPath}#books`">{{
            t('home.shop.allBooks')
          }}</NuxtLink>
        </div>

        <ul class="products">
          <li v-for="p in shop.books" :key="p.slug" class="product">
            <div
              class="product__img"
              :class="{ 'is-missing': !p.photo }"
              :data-ph="p.photo ? undefined : p.slug"
            >
              <img
                v-if="p.photo"
                :src="p.photo.url"
                :srcset="p.photo.srcset"
                sizes="(max-width: 640px) 100vw, 300px"
                :alt="t('home.shop.cover', { name: p.name })"
                loading="lazy"
              />
            </div>
            <div class="product__body">
              <p class="product__cat">{{ t('home.shop.booksCat') }}</p>
              <h3 class="product__name">
                <NuxtLink class="product__link" :to="localePath(`/shop/${p.slug}`)">{{
                  p.name
                }}</NuxtLink>
              </h3>
              <p v-if="p.lead" class="product__desc">{{ p.lead }}</p>
            </div>
            <div class="product__foot">
              <p class="product__price">
                <template v-if="p.priceFrom">{{ t('home.shop.from') }} </template
                >{{ formatPrice(p.priceCents) }}
              </p>
              <NuxtLink class="btn btn--sm" :to="localePath(`/shop/${p.slug}`)">{{
                t('home.shop.buy')
              }}</NuxtLink>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>
