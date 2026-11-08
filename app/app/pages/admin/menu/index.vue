<script setup lang="ts">
// Основное меню в админке: категории и блюда. Разметка и классы — из прототипа (admin/menu.html).
// Категории и отметки — pages/admin/menu/setup.vue. Строка блюда — components/AdminDishRow.vue.
// Порядок блюд — перетаскиванием за ⋮⋮ внутри категории; в другую категорию — в карточке блюда.
import { VueDraggable } from 'vue-draggable-plus'
import type { AdminDish, AdminMenu, AdminMenuCategory } from '#shared/menu'
import { contentLocales, pickTranslation } from '#shared/locales'
import { dishWords, plural } from '#shared/plural'

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

function localized(values: Partial<Record<string, string>>) {
  const rows = Object.entries(values).map(([locale, text]) => ({ locale, text: text ?? '' }))
  return pickTranslation(rows, ADMIN_LOCALE)?.text ?? ''
}

const tagNames = computed(
  () => new Map((menu.value?.dietTags ?? []).map((t) => [t.id, localized(t.names)])),
)
const labelNames = computed(
  () => new Map((menu.value?.labels ?? []).map((l) => [l.id, localized(l.names)])),
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

const filtering = computed(() => !!search.value.trim() || show.value !== 'all')

/** Блюда категории с учётом поиска и фильтра */
function shown(category: AdminMenuCategory) {
  return filtering.value ? category.dishes.filter(matches) : category.dishes
}

// Категории без подходящих блюд при поиске прячем; без поиска показываем все, даже пустые
const categories = computed(() =>
  (menu.value?.categories ?? []).filter((c) => !filtering.value || shown(c).length > 0),
)

const dishWord = (n: number) => plural(n, dishWords)

// ---------- «На сайте» прямо в списке и порядок ----------

const toggleError = ref('')

// Перетаскивать можно без поиска и фильтра: в неполном списке порядок неоднозначен
const canReorder = computed(() => canEdit.value && !filtering.value)

/** Блюда уже переставлены на экране (v-model) — сохраняем новый порядок */
async function saveOrder(category: AdminMenuCategory) {
  toggleError.value = ''
  try {
    await $fetch<unknown>(`/api/admin/menu/categories/${category.id}/dishes-order`, {
      method: 'PUT',
      body: { ids: category.dishes.map((d) => d.id) },
    })
  } catch (e) {
    toggleError.value = apiErrorMessage(e, 'Не удалось сохранить порядок. Попробуйте ещё раз.')
    await refresh() // вернуть порядок, который на самом деле в базе
  }
}

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
        <NuxtLink class="btn btn--sm" to="/admin/menu/setup">Категории и отметки</NuxtLink>
        <NuxtLink v-if="canEdit" class="btn btn--solid btn--sm" to="/admin/menu/new">
          Добавить блюдо
        </NuxtLink>
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
        <p v-if="canEdit" class="adm-toolbar__note">
          <template v-if="filtering">Порядок можно менять, когда поиск и фильтр выключены</template>
          <template v-else>
            Порядок блюд — перетаскиванием за <span class="adm-drag"><AdminDragIcon /></span>
          </template>
        </p>
      </div>

      <div class="adm-table-wrap">
        <table class="adm-table">
          <thead>
            <tr>
              <th scope="col"><span class="adm-vh">Порядок</span></th>
              <th scope="col">Фото</th>
              <th scope="col">Блюдо</th>
              <th scope="col" class="num">Цена</th>
              <th scope="col">Переводы</th>
              <th scope="col">Видимость</th>
              <th scope="col"><span class="adm-vh">Изменить</span></th>
            </tr>
          </thead>
          <template v-for="category in categories" :key="category.id">
            <tbody>
              <tr class="adm-cat-row">
                <td colspan="7">
                  <div class="adm-cat-row__inner">
                    <span class="adm-cat-row__name">{{ localized(category.names) }}</span>
                    <span class="adm-cat-row__count">
                      {{ category.dishes.length }} {{ dishWord(category.dishes.length) }}
                    </span>
                    <span v-if="!category.isVisible" class="adm-label">Скрыта на сайте</span>
                    <span v-if="canEdit" class="adm-cat-row__links">
                      <NuxtLink to="/admin/menu/setup#categories">Переименовать</NuxtLink>
                      <NuxtLink :to="{ path: '/admin/menu/new', query: { category: category.id } }">
                        + Блюдо в категорию
                      </NuxtLink>
                    </span>
                  </div>
                </td>
              </tr>
            </tbody>
            <!-- Блюда — отдельным tbody: перетаскивание переставляет только их -->
            <VueDraggable
              v-model="category.dishes"
              tag="tbody"
              handle=".adm-drag"
              :animation="150"
              :disabled="!canReorder"
              @end="saveOrder(category)"
            >
              <AdminDishRow
                v-for="dish in shown(category)"
                :key="dish.id"
                :dish="dish"
                :can-edit="canEdit"
                :draggable="canReorder"
                :label-names="labelNames"
                :tag-names="tagNames"
                @toggle="toggleVisible(dish)"
              />
            </VueDraggable>
          </template>
        </table>
      </div>
      <p v-if="!categories.length" class="adm-note" style="margin-top: 16px">Ничего не нашлось.</p>
    </template>
  </div>
</template>
