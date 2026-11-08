<script setup lang="ts">
// Сеты банкета (7.1): три ступени — базовый, средний, премиум. Название и состав правятся
// здесь, цена на гостя считается из цен блюд каталога. Разметка — из прототипа (admin/menu-banquet.html).
import {
  banquetTierTitles,
  type AdminBanquetSet,
  type AdminCatalogCategory,
  type AdminCatalogDish,
} from '#shared/catalog'
import type { Localized } from '#shared/menu'
import { contentLocales, pickTranslation, type ContentLocale } from '#shared/locales'
import { formatPrice } from '#shared/money'

const props = defineProps<{
  sets: AdminBanquetSet[]
  categories: AdminCatalogCategory[]
  canEdit: boolean
}>()
const emit = defineEmits<{ saved: [] }>()

const name = (names: Localized<string>) =>
  pickTranslation(
    Object.entries(names).map(([locale, text]) => ({ locale, text: text ?? '' })),
    'ru',
  )?.text ?? ''

const dishes = computed(
  () => new Map(props.categories.flatMap((c) => c.dishes).map((d) => [d.id, d])),
)
const setDishes = (set: AdminBanquetSet) =>
  set.dishIds.map((id) => dishes.value.get(id)).filter((d): d is AdminCatalogDish => !!d)
const price = (set: AdminBanquetSet) => setDishes(set).reduce((sum, d) => sum + d.priceCents, 0)

// ---------- Правка одного сета ----------

const editing = ref<AdminBanquetSet['tier'] | null>(null)
const lang = ref<ContentLocale>('ru')
const draft = reactive({ names: {} as Record<ContentLocale, string>, dishIds: [] as number[] })
const error = ref('')
const saving = ref(false)

function edit(set: AdminBanquetSet) {
  editing.value = set.tier
  error.value = ''
  draft.names = Object.fromEntries(contentLocales.map((l) => [l, set.names[l] ?? ''])) as Record<
    ContentLocale,
    string
  >
  draft.dishIds = [...set.dishIds]
}

async function save() {
  if (!editing.value) return
  saving.value = true
  error.value = ''
  // Блюда в сете — в порядке каталога, как гость увидит их в калькуляторе
  const order = [...dishes.value.keys()]
  const dishIds = [...draft.dishIds].sort((a, b) => order.indexOf(a) - order.indexOf(b))
  try {
    await $fetch<unknown>(`/api/admin/catalog/banquet/sets/${editing.value}`, {
      method: 'PUT',
      body: {
        names: Object.fromEntries(
          contentLocales
            .filter((l) => draft.names[l].trim())
            .map((l) => [l, draft.names[l].trim()]),
        ),
        dishIds,
      },
    })
    editing.value = null
    emit('saved')
  } catch (e) {
    error.value = apiErrorMessage(e, 'Не удалось сохранить. Попробуйте ещё раз.')
  } finally {
    saving.value = false
  }
}

const draftPrice = computed(() =>
  draft.dishIds.reduce((sum, id) => sum + (dishes.value.get(id)?.priceCents ?? 0), 0),
)
</script>

<template>
  <section class="adm-panel" aria-labelledby="p-sets">
    <div class="adm-panel__head">
      <h2 id="p-sets" class="adm-panel__title">Сеты</h2>
      <p class="adm-panel__hint">Цена сета считается из цен блюд — отдельно не вводится</p>
    </div>
    <div class="adm-sets">
      <article v-for="set in sets" :key="set.tier" class="adm-set">
        <p class="adm-set__tier">{{ banquetTierTitles[set.tier] }}</p>

        <template v-if="editing !== set.tier">
          <h3 class="adm-set__name">{{ name(set.names) || 'Без названия' }}</h3>
          <ul v-if="set.dishIds.length" class="adm-set__list">
            <li
              v-for="dish in setDishes(set)"
              :key="dish.id"
              :class="{ 'adm-danger': !dish.isAvailable }"
            >
              {{ name(dish.names) }}{{ dish.isAvailable ? '' : ' — нельзя заказать' }}
            </li>
          </ul>
          <p v-else class="adm-note">Сет пустой — на сайте его не покажем</p>
          <p class="adm-set__price">
            <b>{{ formatPrice(price(set)) }}</b> на гостя
          </p>
          <p v-if="canEdit" class="adm-set__edit">
            <button class="adm-link-btn" type="button" :disabled="!!editing" @click="edit(set)">
              Изменить состав и название
            </button>
          </p>
        </template>

        <form v-else class="adm-stack" style="gap: 12px" @submit.prevent="save">
          <div class="adm-lang-tabs" role="tablist" aria-label="Язык названия">
            <button
              v-for="l in contentLocales"
              :key="l"
              type="button"
              role="tab"
              :aria-selected="lang === l"
              @click="lang = l"
            >
              {{ l.toUpperCase() }}
            </button>
          </div>
          <div class="field">
            <label :for="`set-${set.tier}-name`">Название ({{ lang.toUpperCase() }})</label>
            <input
              :id="`set-${set.tier}-name`"
              v-model="draft.names[lang]"
              type="text"
              maxlength="100"
              placeholder="Например, «Купеческий»"
            />
          </div>
          <fieldset v-for="category in categories" :key="category.id" class="adm-set__pick">
            <legend class="adm-legend-title">{{ name(category.names) }}</legend>
            <label v-for="dish in category.dishes" :key="dish.id" class="adm-check">
              <input v-model="draft.dishIds" type="checkbox" :value="dish.id" />
              <span>
                {{ name(dish.names) }} · {{ formatPrice(dish.priceCents) }}
                <small v-if="!dish.isAvailable" class="adm-danger">нельзя заказать</small>
              </span>
            </label>
          </fieldset>
          <p v-if="!categories.length" class="adm-note">Сначала добавьте блюда в каталог ниже.</p>
          <p class="adm-set__price">
            <b>{{ formatPrice(draftPrice) }}</b> на гостя
          </p>
          <p v-if="error" class="adm-note adm-danger" role="alert">{{ error }}</p>
          <div class="adm-row-actions">
            <button class="adm-link-btn adm-link-btn--strong" type="submit" :disabled="saving">
              Сохранить
            </button>
            <button class="adm-link-btn" type="button" @click="editing = null">Отмена</button>
          </div>
        </form>
      </article>
    </div>
  </section>
</template>
