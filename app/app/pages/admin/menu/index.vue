<script setup lang="ts">
// Основное меню в админке: категории и блюда. Разметка и классы — из прототипа (admin/menu.html).
// Порядок перетаскиванием и правка категорий — следующим слоем.
import type { AdminDish, AdminMenu } from '#shared/menu'
import { contentLocales, pickTranslation } from '#shared/locales'
import { formatPrice } from '#shared/money'

definePageMeta({ layout: 'admin', access: ['menu'] })
defineI18nRoute(false)
useHead({ title: 'Меню — админка Peetri Toll' })

const { can } = useAdminUser()
const canEdit = computed(() => can('menu', 'edit'))

// deep: переключатель «На сайте» меняет поле блюда внутри данных — экран должен это видеть
// (в Nuxt 4 данные useFetch по умолчанию следят только за заменой целиком)
const { data: menu, error, refresh } = await useFetch<AdminMenu>('/api/admin/menu', { deep: true })

// Админка на русском: показываем русский текст, нет его — эстонский, потом любой
const ADMIN_LOCALE = 'ru'

function dishText(dish: AdminDish) {
  const rows = contentLocales.flatMap((locale) => {
    const t = dish.translations[locale]
    return t ? [{ locale, ...t }] : []
  })
  return pickTranslation(rows, ADMIN_LOCALE)
}

function localized(values: Partial<Record<string, string>>) {
  const rows = Object.entries(values).map(([locale, text]) => ({ locale, text: text ?? '' }))
  return pickTranslation(rows, ADMIN_LOCALE)?.text ?? ''
}

function price(dish: AdminDish) {
  if (dish.portions.length === 1) return formatPrice(dish.portions[0]!.priceCents)
  // Несколько порций: «4,00 / 5,00 €»
  return `${dish.portions.map((p) => formatPrice(p.priceCents).replace(' €', '')).join(' / ')} €`
}

const tagNames = computed(
  () => new Map((menu.value?.dietTags ?? []).map((t) => [t.id, localized(t.names)])),
)

const dishCount = computed(() =>
  (menu.value?.categories ?? []).reduce((sum, c) => sum + c.dishes.length, 0),
)

// ---------- Поиск и фильтр, как в прототипе ----------

const search = ref('')
const show = ref<'all' | 'hidden' | 'untranslated' | 'nophoto'>('all')

function matches(dish: AdminDish) {
  const query = search.value.trim().toLowerCase()
  if (query) {
    const names = Object.values(dish.translations).map((t) => t?.name.toLowerCase() ?? '')
    if (!names.some((name) => name.includes(query))) return false
  }
  if (show.value === 'hidden') return !dish.isVisible
  if (show.value === 'untranslated') return contentLocales.some((l) => !dish.translations[l])
  if (show.value === 'nophoto') return !dish.photo
  return true
}

const categories = computed(() =>
  (menu.value?.categories ?? [])
    .map((category) => ({ ...category, shown: category.dishes.filter(matches) }))
    .filter((category) => category.shown.length > 0 || (!search.value && show.value === 'all')),
)

function dishWord(n: number) {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'блюдо'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'блюда'
  return 'блюд'
}

// ---------- «На сайте» прямо в списке ----------

const toggleError = ref('')

async function toggleVisible(dish: AdminDish) {
  const next = !dish.isVisible
  dish.isVisible = next // сразу, не дожидаясь сервера
  toggleError.value = ''
  try {
    await $fetch(`/api/admin/menu/dishes/${dish.id}/visibility`, {
      method: 'PATCH',
      body: { isVisible: next },
    })
  } catch (e) {
    dish.isVisible = !next
    toggleError.value = apiErrorMessage(e, 'Не удалось сохранить. Попробуйте ещё раз.')
  }
}
</script>

<template>
  <div>
    <header class="adm-top">
      <div>
        <p class="adm-top__crumb">Содержимое</p>
        <h1 class="adm-top__title">Меню</h1>
      </div>
      <div class="adm-top__actions">
        <NuxtLink v-if="canEdit" class="btn btn--solid btn--sm" to="/admin/menu/new"
          >Блюдо</NuxtLink
        >
      </div>
    </header>

    <ul class="adm-tabs" aria-label="Виды меню">
      <li>
        <NuxtLink to="/admin/menu" aria-current="page">
          Основное<small>{{ dishCount }} {{ dishWord(dishCount) }}</small>
        </NuxtLink>
      </li>
      <!-- Появятся своими срезами (6.1) -->
      <li><span class="adm-tabs__soon" title="Будет позже">Дневное</span></li>
      <li><span class="adm-tabs__soon" title="Будет позже">Банкетное</span></li>
      <li><span class="adm-tabs__soon" title="Будет позже">Групповое</span></li>
    </ul>

    <p v-if="error" class="adm-alert" role="alert">
      {{ apiErrorMessage(error, 'Не удалось загрузить меню.') }}
      <button class="adm-link-btn" type="button" @click="refresh()">Повторить</button>
    </p>
    <p v-if="toggleError" class="adm-alert" role="alert">{{ toggleError }}</p>

    <template v-if="menu">
      <div class="adm-toolbar">
        <label class="adm-search">
          <span class="adm-vh">Поиск по меню</span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input v-model="search" type="search" placeholder="Название блюда" />
        </label>
        <label class="adm-vh" for="m-show">Показать</label>
        <select id="m-show" v-model="show" class="adm-select">
          <option value="all">Все блюда</option>
          <option value="hidden">Только скрытые</option>
          <option value="untranslated">Без перевода</option>
          <option value="nophoto">Без фото</option>
        </select>
      </div>

      <div class="adm-table-wrap">
        <table class="adm-table">
          <thead>
            <tr>
              <th scope="col">Фото</th>
              <th scope="col">Блюдо</th>
              <th scope="col" class="num">Цена</th>
              <th scope="col">Переводы</th>
              <th scope="col">Видимость</th>
              <th scope="col"><span class="adm-vh">Изменить</span></th>
            </tr>
          </thead>
          <tbody v-for="category in categories" :key="category.id">
            <tr class="adm-cat-row">
              <td colspan="6">
                <div class="adm-cat-row__inner">
                  <span class="adm-cat-row__name">{{ localized(category.names) }}</span>
                  <span class="adm-cat-row__count">
                    {{ category.dishes.length }} {{ dishWord(category.dishes.length) }}
                  </span>
                  <span v-if="canEdit" class="adm-cat-row__links">
                    <NuxtLink :to="{ path: '/admin/menu/new', query: { category: category.id } }">
                      + Блюдо в категорию
                    </NuxtLink>
                  </span>
                </div>
              </td>
            </tr>
            <tr
              v-for="dish in category.shown"
              :key="dish.id"
              :class="{ 'adm-row--hidden': !dish.isVisible }"
            >
              <td>
                <img v-if="dish.photo" class="adm-thumb" :src="dish.photo" alt="" loading="lazy" />
                <span v-else class="adm-thumb--empty">нет фото</span>
              </td>
              <td>
                <NuxtLink class="adm-dish__name" :to="`/admin/menu/${dish.id}`">
                  {{ dishText(dish)?.name }}
                </NuxtLink>
                <span v-if="dish.isNew" class="adm-label">Новинка</span>
                <span v-if="dish.isKids" class="adm-label">Детское</span>
                <span v-for="tagId in dish.dietTagIds" :key="tagId" class="adm-diet">
                  {{ tagNames.get(tagId) }}
                </span>
                <small v-if="dishText(dish)?.description">{{ dishText(dish)?.description }}</small>
              </td>
              <td class="num">
                <span class="adm-price">{{ price(dish) }}</span>
              </td>
              <td>
                <AdminLangBadges :has="(locale) => !!dish.translations[locale]" />
              </td>
              <td>
                <label class="adm-switch">
                  <input
                    type="checkbox"
                    :checked="dish.isVisible"
                    :disabled="!canEdit"
                    :aria-label="`Показывать на сайте: ${dishText(dish)?.name}`"
                    @change="toggleVisible(dish)"
                  />
                  <span class="adm-switch__track" />
                  {{ dish.isVisible ? 'На сайте' : 'Скрыто' }}
                </label>
              </td>
              <td>
                <NuxtLink
                  class="adm-open"
                  :to="`/admin/menu/${dish.id}`"
                  :aria-label="`${canEdit ? 'Изменить' : 'Открыть'}: ${dishText(dish)?.name}`"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-if="!categories.length" class="adm-note" style="margin-top: 16px">Ничего не нашлось.</p>
    </template>
  </div>
</template>
