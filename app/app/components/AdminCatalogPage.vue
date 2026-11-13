<script setup lang="ts">
// Банкетное меню — каталог для калькулятора на сайте (7.1). Групповое — «Трапезы групп»,
// своя страница (pages/admin/menu/group).
// Разметка — из прототипа (admin/menu-banquet.html). Сеты банкета — components/AdminBanquetSets.vue.
import { VueDraggable } from 'vue-draggable-plus'
import {
  unitPriceLabel,
  catalogTitles,
  type AdminCatalog,
  type AdminCatalogCategory,
  type AdminCatalogDish,
  type BanquetSettings,
  type CatalogKind,
} from '#shared/catalog'
import type { Localized } from '#shared/menu'
import { contentLocales, pickTranslation, type ContentLocale } from '#shared/locales'
import { formatPrice } from '#shared/money'

const props = defineProps<{ kind: CatalogKind }>()

const { can } = useAdminUser()
const canEdit = computed(() => can('menu', 'edit'))

// deep: перетаскивание и переключатели меняют данные внутри — экран должен это видеть
const { data, error, refresh } = await useFetch<AdminCatalog>(`/api/admin/catalog/${props.kind}`, {
  deep: true,
})

const base = `/admin/menu/${props.kind}`
const name = (names: Localized<string>) =>
  pickTranslation(
    Object.entries(names).map(([locale, text]) => ({ locale, text: text ?? '' })),
    'ru',
  )?.text ?? ''

const notice = ref('')

async function call(request: () => Promise<unknown>, fallback: string) {
  notice.value = ''
  try {
    await request()
    return true
  } catch (e) {
    notice.value = apiErrorMessage(e, fallback)
    await refresh()
    return false
  }
}

// ---------- Блюда ----------

function priceNote(dish: AdminCatalogDish) {
  if (dish.previousPriceCents === null || !dish.priceChangedAt) return ''
  const date = new Date(dish.priceChangedAt).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
  })
  return `цена изменена ${date}: было ${formatPrice(dish.previousPriceCents)}`
}

function toggleAvailable(dish: AdminCatalogDish) {
  dish.isAvailable = !dish.isAvailable
  call(
    () =>
      $fetch<unknown>(`/api/admin/catalog/dishes/${dish.id}/availability`, {
        method: 'PATCH',
        body: { isAvailable: dish.isAvailable },
      }),
    'Не удалось сохранить. Попробуйте ещё раз.',
  )
}

function saveDishOrder(category: AdminCatalogCategory) {
  call(
    () =>
      $fetch<unknown>(`/api/admin/catalog/categories/${category.id}/dishes-order`, {
        method: 'PUT',
        body: { ids: category.dishes.map((d) => d.id) },
      }),
    'Не удалось сохранить порядок. Попробуйте ещё раз.',
  )
}

// ---------- Категории ----------

const addingCategory = ref(false)
type Done = (error?: string) => void

async function saveCategory(id: number | null, names: Localized<string>, done: Done) {
  try {
    const url: string =
      id === null
        ? `/api/admin/catalog/${props.kind}/categories`
        : `/api/admin/catalog/categories/${id}`
    await $fetch<unknown>(url, { method: id === null ? 'POST' : 'PUT', body: { names } })
    if (id === null) addingCategory.value = false
    await refresh()
    done()
  } catch (e) {
    done(apiErrorMessage(e, 'Не удалось сохранить. Попробуйте ещё раз.'))
  }
}

async function removeCategory(category: AdminCatalogCategory, done: Done) {
  if (!confirm(`Удалить категорию «${name(category.names)}»?`)) return done()
  try {
    await $fetch<unknown>(`/api/admin/catalog/categories/${category.id}`, { method: 'DELETE' })
    await refresh()
    done()
  } catch (e) {
    done(apiErrorMessage(e, 'Не удалось удалить. Попробуйте ещё раз.'))
  }
}

function saveCategoryOrder() {
  call(
    () =>
      $fetch<unknown>(`/api/admin/catalog/${props.kind}/categories/order`, {
        method: 'PUT',
        body: { ids: data.value!.categories.map((c) => c.id) },
      }),
    'Не удалось сохранить порядок. Попробуйте ещё раз.',
  )
}

// ---------- Настройки калькулятора ----------

const lang = ref<ContentLocale>('ru')
const settings = ref(data.value ? structuredClone(toRaw(data.value.settings)) : null)
watch(
  () => data.value?.settings,
  (s) => {
    if (s) settings.value = structuredClone(toRaw(s))
  },
)
const banquet = computed(() => settings.value)
const settingsMessage = ref('')
const settingsError = ref('')

async function saveSettings() {
  settingsMessage.value = ''
  settingsError.value = ''
  try {
    settings.value = await $fetch<BanquetSettings>(`/api/admin/catalog/${props.kind}/settings`, {
      method: 'PUT',
      body: settings.value,
    })
    settingsMessage.value = 'Настройки сохранены.'
  } catch (e) {
    settingsError.value = apiErrorMessage(e, 'Не удалось сохранить. Попробуйте ещё раз.')
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
      <div v-if="canEdit && data?.categories.length" class="adm-top__actions">
        <NuxtLink class="btn btn--solid btn--sm" :to="`${base}/new`">Добавить блюдо</NuxtLink>
      </div>
    </header>

    <AdminMenuTabs :current="kind" />

    <p v-if="error" class="adm-alert" role="alert">
      {{ apiErrorMessage(error, 'Не удалось загрузить меню.') }}
    </p>
    <p v-if="!canEdit" class="adm-alert" role="note">У вас право только смотреть меню.</p>
    <p v-if="notice" class="adm-alert" role="alert">{{ notice }}</p>

    <div v-if="data && settings" class="adm-layout">
      <div class="adm-stack">
        <AdminBanquetSets
          v-if="data.sets"
          :sets="data.sets"
          :categories="data.categories"
          :can-edit="canEdit"
          @saved="refresh()"
        />

        <section class="adm-panel" aria-labelledby="p-cat" style="padding-bottom: 8px">
          <div class="adm-panel__head">
            <h2 id="p-cat" class="adm-panel__title">Блюда для калькулятора</h2>
            <p class="adm-panel__hint">Новая цена не меняет поступившие заявки: в них снимок цен</p>
          </div>

          <p v-if="!data.categories.length" class="adm-note" style="padding-bottom: 12px">
            Меню пока пустое. Добавьте категорию ниже («Холодные закуски», «Горячее»…), потом —
            блюда.
          </p>

          <table v-else class="adm-table">
            <thead>
              <tr>
                <th scope="col"><span class="adm-vh">Порядок</span></th>
                <th scope="col">Блюдо</th>
                <th scope="col" class="num">За порцию</th>
                <th scope="col">Переводы</th>
                <th scope="col">Доступность</th>
              </tr>
            </thead>
            <template v-for="category in data.categories" :key="category.id">
              <tbody>
                <tr class="adm-cat-row">
                  <td colspan="5">
                    <div class="adm-cat-row__inner">
                      <span class="adm-cat-row__name">{{ name(category.names) }}</span>
                      <span v-if="canEdit" class="adm-cat-row__links">
                        <NuxtLink :to="{ path: `${base}/new`, query: { category: category.id } }">
                          + Блюдо в категорию
                        </NuxtLink>
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
              <VueDraggable
                v-model="category.dishes"
                tag="tbody"
                handle=".adm-drag"
                :animation="150"
                :disabled="!canEdit"
                @end="saveDishOrder(category)"
              >
                <tr
                  v-for="dish in category.dishes"
                  :key="dish.id"
                  :class="{ 'adm-row--hidden': !dish.isAvailable }"
                >
                  <td>
                    <span
                      v-if="canEdit"
                      class="adm-drag"
                      title="Перетащите, чтобы поменять порядок"
                    >
                      <AdminDragIcon />
                    </span>
                  </td>
                  <td>
                    <NuxtLink class="adm-dish__name" :to="`${base}/${dish.id}`">
                      {{ name(dish.names) }}
                    </NuxtLink>
                    <small v-if="priceNote(dish)" class="adm-danger">{{ priceNote(dish) }}</small>
                  </td>
                  <td class="num">
                    <span class="adm-price">{{ unitPriceLabel(dish) }}</span>
                  </td>
                  <td>
                    <AdminLangBadges :has="(l) => !!dish.names[l]" />
                  </td>
                  <td>
                    <label class="adm-switch">
                      <input
                        type="checkbox"
                        :checked="dish.isAvailable"
                        :disabled="!canEdit"
                        :aria-label="`Можно заказать: ${name(dish.names)}`"
                        @change="toggleAvailable(dish)"
                      />
                      <span class="adm-switch__track" />
                      {{ dish.isAvailable ? 'Можно заказать' : 'Нельзя' }}
                    </label>
                  </td>
                </tr>
              </VueDraggable>
            </template>
          </table>
        </section>

        <section id="categories" class="adm-panel" aria-labelledby="p-cats">
          <div class="adm-panel__head">
            <h2 id="p-cats" class="adm-panel__title">Категории</h2>
            <p class="adm-panel__hint">Порядок — перетаскиванием; удалить можно только пустую</p>
          </div>
          <table class="adm-table">
            <thead>
              <tr>
                <th scope="col"><span class="adm-vh">Порядок</span></th>
                <th scope="col">ET</th>
                <th scope="col">EN</th>
                <th scope="col">RU</th>
                <th scope="col" class="num">Блюд</th>
                <th scope="col"><span class="adm-vh">Действия</span></th>
              </tr>
            </thead>
            <VueDraggable
              v-model="data.categories"
              tag="tbody"
              handle=".adm-drag"
              :animation="150"
              :disabled="!canEdit"
              @end="saveCategoryOrder"
            >
              <AdminNamesRow
                v-for="c in data.categories"
                :id="c.id"
                :key="c.id"
                :names="c.names"
                :count="c.dishes.length"
                :can-edit="canEdit"
                :draggable="canEdit"
                :delete-blocked="c.dishes.length ? 'Сначала перенесите или удалите блюда' : ''"
                @save="(p, done) => saveCategory(c.id, p.names, done)"
                @remove="(done) => removeCategory(c, done)"
              />
            </VueDraggable>
            <tbody v-if="addingCategory">
              <AdminNamesRow
                :id="null"
                :names="{}"
                :can-edit="canEdit"
                @save="(p, done) => saveCategory(null, p.names, done)"
                @cancel="addingCategory = false"
              />
            </tbody>
          </table>
          <p v-if="canEdit && !addingCategory" style="margin-top: 14px">
            <button class="adm-link-btn" type="button" @click="addingCategory = true">
              + Добавить категорию
            </button>
          </p>
        </section>
      </div>

      <aside class="adm-stack" aria-label="Настройки калькулятора">
        <section class="adm-panel" aria-labelledby="p-calc-set">
          <h2 id="p-calc-set" class="adm-panel__title" style="margin-bottom: 14px">
            Калькулятор на сайте
          </h2>
          <form @submit.prevent="saveSettings">
            <fieldset
              :disabled="!canEdit"
              class="adm-stack"
              style="gap: 16px; border: 0; padding: 0; margin: 0"
            >
              <template v-if="banquet">
                <div class="field">
                  <span class="adm-legend-title">Вместимость зала, гостей</span>
                  <div class="adm-inline">
                    <input
                      v-model.number="banquet.capacityMin"
                      type="number"
                      min="1"
                      aria-label="От"
                    />
                    <span>—</span>
                    <input
                      v-model.number="banquet.capacityMax"
                      type="number"
                      min="1"
                      aria-label="До"
                    />
                  </div>
                  <span class="adm-note">
                    Зал можно расширять — поменяйте цифры, и калькулятор с формой сразу их учтут
                  </span>
                </div>
                <div class="field">
                  <label for="c-days">Запрос не позже чем за, дней до события</label>
                  <input id="c-days" v-model.number="banquet.leadDays" type="number" min="0" />
                </div>
              </template>

              <div class="field">
                <span class="adm-legend-title">Подсказка гостю</span>
                <div class="adm-lang-tabs" role="tablist" aria-label="Язык подсказки">
                  <button
                    v-for="l in contentLocales"
                    :key="l"
                    type="button"
                    role="tab"
                    :aria-selected="lang === l"
                    :class="{ 'is-untranslated': !settings.hint[l] }"
                    @click="lang = l"
                  >
                    {{ l.toUpperCase() }}
                  </button>
                </div>
                <label class="adm-vh" for="c-hint">Подсказка ({{ lang.toUpperCase() }})</label>
                <textarea id="c-hint" v-model="settings.hint[lang]" maxlength="500" />
              </div>

              <template v-if="banquet">
                <div class="field">
                  <label for="c-warn-cat">Предупреждать, если мало порций в категории</label>
                  <select id="c-warn-cat" v-model="banquet.warnCategoryId">
                    <option :value="null">— не предупреждать —</option>
                    <option v-for="c in data.categories" :key="c.id" :value="c.id">
                      {{ name(c.names) }}
                    </option>
                  </select>
                </div>
                <div v-if="banquet.warnCategoryId !== null" class="field">
                  <label for="c-warn-min">Меньше скольких порций на гостя</label>
                  <input
                    id="c-warn-min"
                    v-model.number="banquet.warnMinPerGuest"
                    type="number"
                    min="0"
                    step="0.5"
                  />
                  <span class="adm-note">
                    Например, «Горячее» и 1: на 20 гостей выбрано меньше 20 порций — подскажем гостю
                  </span>
                </div>
              </template>
            </fieldset>
            <p v-if="banquet" class="adm-panel__hint" style="margin-top: 14px">
              Предупреждения мягкие: гость может отправить заявку всё равно.
            </p>
            <p v-if="settingsError" class="adm-note adm-danger" role="alert">{{ settingsError }}</p>
            <p v-if="settingsMessage" class="adm-note" role="status">{{ settingsMessage }}</p>
            <div v-if="canEdit" style="margin-top: 14px">
              <button class="btn btn--sm" type="submit">Сохранить настройки</button>
            </div>
          </form>
        </section>
        <p class="adm-note">
          {{ catalogTitles[kind] }} меню не связано с основным: свои блюда и цены за порцию.
        </p>
      </aside>
    </div>
  </div>
</template>
