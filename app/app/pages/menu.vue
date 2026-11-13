<script setup lang="ts">
// «Роспись кушаньям» — основное меню из базы (menu.html прототипа, карточки — вариант 3).
// Блюда с фото — карточками, без фото — списком «Также»; категория вовсе без фото (напитки,
// соусы) — списком в две колонки. Фильтр — две группы: ограничения (подходит под все выбранные)
// и подборки (одна за раз). Клик по фото открывает его крупно — components/MenuLightbox.vue.
import { dietIcons, type SiteDish, type SiteMark, type SiteMenu } from '#shared/site-menu'
import { formatPrice } from '#shared/money'

const { t, locale } = useI18n()
const localePath = useLocalePath()

useHead({ title: () => `${t('menu.title')} — Tavern Peetri Toll` })

const { data: menu, error } = await useFetch<SiteMenu>('/api/site/menu', { query: { locale } })
if (error.value?.statusCode === 404) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found', fatal: true })
}

const marks = computed(
  () =>
    new Map<string, SiteMark>(
      [...(menu.value?.dietTags ?? []), ...(menu.value?.labels ?? [])].map((m) => [m.key, m]),
    ),
)
const filterTags = computed(() => menu.value?.dietTags.filter((m) => m.inFilter) ?? [])
const filterPicks = computed(() => menu.value?.labels.filter((m) => m.inFilter) ?? [])

// ---------- Фильтр ----------

const selected = ref<string[]>([])
const pick = ref<string | null>(null)
const filtering = computed(() => selected.value.length > 0 || pick.value !== null)

function toggleTag(key: string) {
  selected.value = selected.value.includes(key)
    ? selected.value.filter((k) => k !== key)
    : [...selected.value, key]
}
function togglePick(key: string) {
  pick.value = pick.value === key ? null : key
}
function reset() {
  selected.value = []
  pick.value = null
}

const shown = (d: SiteDish) =>
  selected.value.every((k) => d.diet.includes(k)) && (!pick.value || d.labels.includes(pick.value))

const categories = computed(() =>
  (menu.value?.categories ?? []).map((c) => {
    const withPhotos = c.dishes.some((d) => d.photo)
    const visible = c.dishes.filter(shown)
    return {
      ...c,
      withPhotos,
      cards: withPhotos ? visible.filter((d) => d.photo) : [],
      list: withPhotos ? visible.filter((d) => !d.photo) : visible,
      empty: visible.length === 0,
    }
  }),
)
const nothingFound = computed(() => filtering.value && categories.value.every((c) => c.empty))

// Фото крупно: листаются блюда с фото, которые сейчас видны
const lightbox = ref<{ open: (id: number) => void } | null>(null)
const photoDishes = computed(() => categories.value.flatMap((c) => c.cards))

// Служебные отметки на карточке — строкой («Новинка»), как в прототипе
const labelLine = (d: SiteDish) =>
  d.labels
    .map((k) => marks.value.get(k)?.name)
    .filter(Boolean)
    .join(' · ')

// ---------- Подпись значка по нажатию (телефон) ----------

const openIcon = ref<string | null>(null)
function closeIcon() {
  openIcon.value = null
}
onMounted(() => document.addEventListener('click', closeIcon))
onBeforeUnmount(() => document.removeEventListener('click', closeIcon))
</script>

<template>
  <div>
    <PageHero
      :title="t('menu.title')"
      image="/images/restaurant-hall.jpg"
      :crumb="t('nav.menu')"
      :lead="t('menu.heroLead')"
    />

    <section id="menyu" class="section section--bg1">
      <div class="container">
        <SectionHead num="01" :crumb="t('menu.crumb')" :title="t('menu.title')" />

        <div class="intro intro--single">
          <h3 class="intro__title">{{ t('menu.lead') }}</h3>
          <p>{{ t('menu.text') }}</p>
        </div>

        <template v-if="menu">
          <ul class="chips chips--center" :aria-label="t('menu.sections')">
            <li v-for="c in categories" :key="c.slug">
              <a class="chip" :class="{ 'is-dim': c.empty }" :href="`#${c.slug}`">{{ c.name }}</a>
            </li>
          </ul>

          <div
            v-if="filterTags.length || filterPicks.length"
            class="diet-filter"
            role="group"
            :aria-label="t('menu.filter')"
          >
            <div
              v-if="filterTags.length"
              class="diet-filter__group"
              role="group"
              :aria-label="t('menu.restrictions')"
            >
              <button
                v-for="m in filterTags"
                :key="m.key"
                class="chip diet-filter__btn"
                type="button"
                :aria-pressed="selected.includes(m.key)"
                :title="m.name"
                @click="toggleTag(m.key)"
              >
                <img
                  v-if="dietIcons[m.key]"
                  :src="dietIcons[m.key]"
                  alt=""
                  width="20"
                  height="19"
                />{{ m.name }}
              </button>
            </div>
            <div
              v-if="filterPicks.length"
              class="diet-filter__group"
              role="group"
              :aria-label="t('menu.picks')"
            >
              <button
                v-for="m in filterPicks"
                :key="m.key"
                class="chip diet-filter__btn diet-filter__btn--pick"
                type="button"
                :aria-pressed="pick === m.key"
                @click="togglePick(m.key)"
              >
                {{ m.name }}
              </button>
            </div>
            <button v-if="filtering" class="diet-filter__reset" type="button" @click="reset">
              {{ t('menu.reset') }}
            </button>
          </div>
          <p v-if="nothingFound" class="diet-empty">
            {{ t('menu.nothing') }}
            <button type="button" class="diet-filter__reset" @click="reset">
              {{ t('menu.resetFilter') }}</button
            >.
          </p>

          <div class="menu-root menu--v3">
            <section
              v-for="c in categories"
              v-show="!c.empty"
              :id="c.slug"
              :key="c.slug"
              class="menu-cat"
            >
              <h3 class="menu-cat__title">{{ c.name }}</h3>

              <ul v-if="c.cards.length" class="dishes">
                <li v-for="d in c.cards" :key="d.id" class="dish">
                  <div
                    class="dish__img"
                    role="button"
                    tabindex="0"
                    :aria-label="t('menu.openPhoto', { name: d.name })"
                    @click="lightbox?.open(d.id)"
                    @keydown.enter.space.prevent="lightbox?.open(d.id)"
                  >
                    <img
                      :src="d.photo!.url"
                      :srcset="d.photo!.srcset ?? undefined"
                      sizes="160px"
                      :alt="d.name"
                      loading="lazy"
                    />
                  </div>
                  <div class="dish__body">
                    <div v-if="d.portions.length === 1" class="dish__top">
                      <h4 class="dish__name">{{ d.name }}</h4>
                      <span class="dish__dots" aria-hidden="true" />
                      <span class="dish__price">{{ formatPrice(d.portions[0]!.priceCents) }}</span>
                    </div>
                    <h4 v-else class="dish__name">{{ d.name }}</h4>
                    <ul v-if="d.portions.length > 1" class="dish__sizes">
                      <li v-for="(p, i) in d.portions" :key="i">
                        <span class="dish__size">{{ p.label }}</span>
                        <span class="dish__dots" aria-hidden="true" />
                        <span class="dish__price">{{ formatPrice(p.priceCents) }}</span>
                      </li>
                    </ul>
                    <p v-if="d.description" class="dish__desc">{{ d.description }}</p>
                    <p v-if="labelLine(d)" class="dish__meta">{{ labelLine(d) }}</p>
                    <MenuMarks
                      :id="String(d.id)"
                      :keys="d.diet"
                      :marks="marks"
                      :open="openIcon"
                      @toggle="openIcon = $event"
                    />
                  </div>
                </li>
              </ul>

              <template v-if="c.list.length">
                <p v-if="c.cards.length" class="price-list__label">{{ t('menu.also') }}</p>
                <ul class="price-list" :class="{ 'price-list--cols': !c.withPhotos }">
                  <li v-for="d in c.list" :key="d.id">
                    <div v-if="d.portions.length === 1" class="dish__top">
                      <span class="price-list__name">{{ d.name }}</span>
                      <span class="dish__dots" aria-hidden="true" />
                      <span class="dish__price">{{ formatPrice(d.portions[0]!.priceCents) }}</span>
                    </div>
                    <template v-else>
                      <span class="price-list__name">{{ d.name }}</span>
                      <ul class="dish__sizes">
                        <li v-for="(p, i) in d.portions" :key="i">
                          <span class="dish__size">{{ p.label }}</span>
                          <span class="dish__dots" aria-hidden="true" />
                          <span class="dish__price">{{ formatPrice(p.priceCents) }}</span>
                        </li>
                      </ul>
                    </template>
                    <p v-if="d.description" class="price-list__desc">{{ d.description }}</p>
                  </li>
                </ul>
              </template>
            </section>
          </div>
        </template>

        <div class="cta-row">
          <p class="quote quote--gold">{{ t('menu.allergens') }}</p>
          <NuxtLink class="btn btn--red" :to="localePath('/restaurant') + '#bron'">{{
            t('menu.book')
          }}</NuxtLink>
        </div>
      </div>
    </section>

    <MenuLightbox ref="lightbox" :dishes="photoDishes" />
  </div>
</template>
