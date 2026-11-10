<script setup lang="ts">
// Товары (7.3, 8.5): список с языками показа кликом, категории, доставка.
// Разметка и классы — из прототипа (admin/products.html). Карточка — pages/admin/products/[id].vue.
import { VueDraggable } from 'vue-draggable-plus'
import { contentLocales, type ContentLocale } from '#shared/locales'
import type { Localized } from '#shared/menu'
import { formatPrice, parsePrice } from '#shared/money'
import { plural } from '#shared/plural'
import {
  productStateNames,
  variantKindNames,
  type AdminProductRow,
  type AdminShop,
  type ProductState,
} from '#shared/shop'

definePageMeta({ layout: 'admin', access: ['products'] })
defineI18nRoute(false)
useHead({ title: 'Товары — админка Peetri Toll' })

const { can } = useAdminUser()
const canEdit = computed(() => can('products', 'edit'))
const { data, error, refresh } = await useFetch<AdminShop>('/api/admin/shop')
const actionError = ref('')

const localeNames: Record<ContentLocale, string> = {
  et: 'эстонской',
  en: 'английской',
  ru: 'русской',
}
const localeShort: Record<ContentLocale, string> = { et: 'ET', en: 'EN', ru: 'RU' }

// ---------- Фильтры ----------

const category = ref<'all' | number>('all')
const kind = ref<'all' | 'physical' | 'digital'>('all')
const lang = ref<'all' | `hidden-${ContentLocale}` | 'untranslated'>('all')
const search = ref('')

const rows = computed(() => data.value?.products ?? [])
const categoryName = (id: number) => {
  const names = data.value?.categories.find((c) => c.id === id)?.names
  return names?.ru ?? names?.et ?? Object.values(names ?? {})[0] ?? ''
}

/** Показан на языке, а перевода нет — покажем эстонский текст */
const untranslated = (p: AdminProductRow) => p.locales.some((l) => !p.translated.includes(l))

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return rows.value.filter((p) => {
    if (kind.value !== 'all' && !p.kinds.includes(kind.value)) return false
    if (lang.value === 'untranslated' && !untranslated(p)) return false
    if (
      lang.value.startsWith('hidden-') &&
      p.locales.includes(lang.value.slice(7) as ContentLocale)
    )
      return false
    return !q || p.name.toLowerCase().includes(q) || (p.lead ?? '').toLowerCase().includes(q)
  })
})
const shown = computed(() =>
  category.value === 'all'
    ? filtered.value
    : filtered.value.filter((p) => p.categoryId === category.value),
)
const count = (id: 'all' | number) =>
  id === 'all' ? filtered.value.length : filtered.value.filter((p) => p.categoryId === id).length

/**
 * Категории, которых в какой-то версии сайта не будет: в них есть товары на сайте,
 * но ни один не показан на этом языке (8.5) — чтобы это не стало сюрпризом
 */
const emptyInLocale = computed(() => {
  const notes: string[] = []
  for (const c of data.value?.categories ?? []) {
    if (!c.isVisible) continue
    const live = rows.value.filter((p) => p.categoryId === c.id && p.state === 'published')
    if (!live.length) continue
    for (const l of contentLocales) {
      if (!live.some((p) => p.locales.includes(l))) {
        notes.push(
          `В ${localeNames[l]} версии скрыты все товары категории «${categoryName(c.id)}» — её там не будет.`,
        )
      }
    }
  }
  return notes
})

// ---------- Языки кликом ----------

function langState(p: AdminProductRow, l: ContentLocale) {
  if (!p.locales.includes(l)) return { cls: 'adm-lang--off', text: 'скрыт в этой версии' }
  if (!p.translated.includes(l)) {
    return { cls: 'adm-lang--missing', text: 'показан, но перевода нет — покажем эстонский текст' }
  }
  return { cls: 'adm-lang--ok', text: 'показан' }
}

async function toggleLocale(p: AdminProductRow, l: ContentLocale) {
  if (!canEdit.value) return
  actionError.value = ''
  const before = p.locales
  p.locales = contentLocales.filter((x) => (x === l ? !before.includes(l) : before.includes(x)))
  try {
    await $fetch(`/api/admin/products/${p.id}/locales`, {
      method: 'PATCH',
      body: { locales: p.locales },
    })
  } catch (e) {
    p.locales = before
    actionError.value = apiErrorMessage(e, 'Не удалось переключить язык. Попробуйте ещё раз.')
  }
}

async function toggleShop(enabled: boolean) {
  if (!data.value) return
  actionError.value = ''
  data.value.shopEnabled = enabled
  try {
    await $fetch('/api/admin/shop/section', { method: 'PUT', body: { enabled } })
  } catch (e) {
    actionError.value = apiErrorMessage(e, 'Не удалось переключить раздел.')
    await refresh()
  }
}

// ---------- Категории ----------

const panel = ref<'none' | 'categories' | 'delivery'>('none')
const addingCategory = ref(false)
type Done = (error?: string) => void

async function run(request: () => Promise<unknown>, done: Done, onSuccess?: () => void) {
  try {
    await request()
    onSuccess?.()
    await refresh()
    done()
  } catch (e) {
    done(apiErrorMessage(e, 'Не удалось сохранить. Попробуйте ещё раз.'))
  }
}

function saveCategory(id: number | null, names: Localized<string>, isVisible: boolean, done: Done) {
  const url: string =
    id === null ? '/api/admin/shop/categories' : `/api/admin/shop/categories/${id}`
  run(
    () =>
      $fetch<unknown>(url, { method: id === null ? 'POST' : 'PUT', body: { names, isVisible } }),
    done,
    () => (addingCategory.value = false),
  )
}

function removeCategory(id: number, done: Done) {
  if (!confirm(`Удалить категорию «${categoryName(id)}»?`)) return done()
  run(
    () => $fetch<unknown>(`/api/admin/shop/categories/${id}`, { method: 'DELETE' }),
    done,
    () => {
      if (category.value === id) category.value = 'all'
    },
  )
}

async function saveCategoryOrder() {
  if (!data.value) return
  actionError.value = ''
  try {
    await $fetch('/api/admin/shop/categories/order', {
      method: 'PUT',
      body: { ids: data.value.categories.map((c) => c.id) },
    })
  } catch (e) {
    actionError.value = apiErrorMessage(e, 'Не удалось сохранить порядок. Попробуйте ещё раз.')
    await refresh()
  }
}

// ---------- Доставка ----------

const delivery = reactive({ estonia: '', eu: '' })
watch(
  () => data.value?.settings,
  (s) => {
    if (!s) return
    delivery.estonia = formatPrice(s.deliveryEstoniaCents).replace(' €', '')
    delivery.eu = formatPrice(s.deliveryEuCents).replace(' €', '')
  },
  { immediate: true },
)
const deliveryError = ref('')
const deliverySaved = ref(false)
async function saveDelivery() {
  deliveryError.value = ''
  const estonia = parsePrice(delivery.estonia)
  const eu = parsePrice(delivery.eu)
  if (estonia === null || eu === null) {
    deliveryError.value = 'Цена — число, например 4,00'
    return
  }
  try {
    await $fetch('/api/admin/shop/settings', {
      method: 'PUT',
      body: { deliveryEstoniaCents: estonia, deliveryEuCents: eu },
    })
    await refresh()
    deliverySaved.value = true
    setTimeout(() => (deliverySaved.value = false), 3000)
  } catch (e) {
    deliveryError.value = apiErrorMessage(e, 'Не удалось сохранить. Попробуйте ещё раз.')
  }
}

// ---------- Подписи ----------

function kindLabel(p: AdminProductRow): string {
  if (!p.kinds.length) return 'Нет вариантов в продаже'
  const files = p.fileLocales.length
    ? ` · файлы ${p.fileLocales.map((l) => localeShort[l]).join(', ')}`
    : ''
  if (p.kinds.length === 2) return `Физический + цифровой${files}`
  return `${variantKindNames[p.kinds[0]!]}${p.kinds[0] === 'digital' ? files : ''}`
}

function price(p: AdminProductRow): string {
  if (p.minPriceCents === null) return '—'
  const min = formatPrice(p.minPriceCents)
  return p.maxPriceCents !== p.minPriceCents ? `от ${min}` : min
}

const statusClass: Record<ProductState, string> = {
  draft: 'adm-status--draft',
  published: 'adm-status--done',
  archived: 'adm-status--archive',
}
</script>

<template>
  <div>
    <header class="adm-top">
      <div>
        <p class="adm-top__crumb">Содержимое</p>
        <h1 class="adm-top__title">Товары</h1>
      </div>
      <div class="adm-top__actions">
        <label v-if="data" class="adm-switch">
          <input
            type="checkbox"
            :checked="data.shopEnabled"
            :disabled="!canEdit"
            @change="toggleShop(($event.target as HTMLInputElement).checked)"
          />
          <span class="adm-switch__track" />Магазин на сайте
        </label>
        <button
          class="btn btn--sm"
          type="button"
          :aria-pressed="panel === 'categories'"
          @click="panel = panel === 'categories' ? 'none' : 'categories'"
        >
          Категории
        </button>
        <button
          class="btn btn--sm"
          type="button"
          :aria-pressed="panel === 'delivery'"
          @click="panel = panel === 'delivery' ? 'none' : 'delivery'"
        >
          Доставка
        </button>
        <NuxtLink v-if="canEdit" class="btn btn--solid btn--sm" to="/admin/products/new">
          <svg class="adm-ico" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5v14M5 12h14" /></svg
          >Товар
        </NuxtLink>
      </div>
    </header>

    <p v-if="error" class="adm-alert" role="alert">
      {{ apiErrorMessage(error, 'Не удалось загрузить товары.') }}
    </p>
    <p v-if="actionError" class="adm-alert" role="alert">{{ actionError }}</p>

    <template v-if="data">
      <section
        v-if="panel === 'categories'"
        class="adm-panel"
        aria-labelledby="p-cats"
        style="margin-bottom: 24px"
      >
        <div class="adm-panel__head">
          <h2 id="p-cats" class="adm-panel__title">Категории</h2>
          <p class="adm-panel__hint">
            Вкладки магазина на сайте, порядок — перетаскиванием. Удалить можно только пустую
          </p>
        </div>
        <div class="adm-table-wrap">
          <table class="adm-table">
            <thead>
              <tr>
                <th scope="col"><span class="adm-vh">Порядок</span></th>
                <th scope="col">ET</th>
                <th scope="col">EN</th>
                <th scope="col">RU</th>
                <th scope="col">На сайте</th>
                <th scope="col" class="num">Товаров</th>
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
                :draggable="canEdit"
                :names="c.names"
                :is-visible="c.isVisible"
                with-visibility
                :count="c.products"
                :can-edit="canEdit"
                :delete-blocked="c.products ? 'Сначала перенесите товары в другую категорию' : ''"
                @save="(p, done) => saveCategory(c.id, p.names, p.isVisible, done)"
                @remove="(done) => removeCategory(c.id, done)"
              />
            </VueDraggable>
            <tbody v-if="addingCategory">
              <AdminNamesRow
                :id="null"
                :names="{}"
                with-visibility
                :can-edit="canEdit"
                @save="(p, done) => saveCategory(null, p.names, p.isVisible, done)"
                @cancel="addingCategory = false"
              />
            </tbody>
          </table>
        </div>
        <p v-if="canEdit && !addingCategory" style="margin-top: 14px">
          <button class="adm-link-btn" type="button" @click="addingCategory = true">
            + Добавить категорию
          </button>
        </p>
        <p class="adm-q" style="margin-top: 10px">
          Порядок и состав категорий — вопрос к заказчице (7.3): «Любимое», «Аудиогид», «Всякая
          всячина», куда уходят «Картины и открытки»
        </p>
      </section>

      <section
        v-if="panel === 'delivery'"
        class="adm-panel"
        aria-labelledby="p-delivery"
        style="margin-bottom: 24px"
      >
        <div class="adm-panel__head">
          <h2 id="p-delivery" class="adm-panel__title">Доставка</h2>
          <p class="adm-panel__hint">
            Одна цена на посылку, без расчёта по весу. Самовывоз в Палдиски — бесплатно
          </p>
        </div>
        <form @submit.prevent="saveDelivery">
          <fieldset class="form adm-fieldset" :disabled="!canEdit">
            <div class="field">
              <label for="d-ee">По Эстонии, €</label>
              <input id="d-ee" v-model="delivery.estonia" type="text" inputmode="decimal" />
            </div>
            <div class="field">
              <label for="d-eu">В страны ЕС, €</label>
              <input id="d-eu" v-model="delivery.eu" type="text" inputmode="decimal" />
            </div>
          </fieldset>
          <div v-if="canEdit" class="adm-actions">
            <button class="btn btn--solid btn--sm" type="submit">Сохранить</button>
            <span v-if="deliverySaved" class="adm-note" role="status">Сохранено</span>
          </div>
          <p v-if="deliveryError" class="adm-note adm-danger">{{ deliveryError }}</p>
        </form>
        <p class="adm-note" style="margin-top: 12px">
          Товары «только самовывоз» (картины, антиквариат) доставкой не отправляются. Цифровые —
          ссылкой на почту, доставка за них не берётся.
        </p>
        <p class="adm-q" style="margin-top: 8px">
          Окончательная схема доставки — вопрос к заказчице (7.3)
        </p>
      </section>

      <div class="adm-filters">
        <ul class="chips" aria-label="Категория">
          <li>
            <button
              class="chip"
              :class="{ 'is-active': category === 'all' }"
              type="button"
              :aria-pressed="category === 'all'"
              @click="category = 'all'"
            >
              Все<span class="chip__count">{{ count('all') }}</span>
            </button>
          </li>
          <li v-for="c in data.categories" :key="c.id">
            <button
              class="chip"
              :class="{ 'is-active': category === c.id }"
              type="button"
              :aria-pressed="category === c.id"
              @click="category = c.id"
            >
              {{ categoryName(c.id) }}<span class="chip__count">{{ count(c.id) }}</span>
            </button>
          </li>
        </ul>
      </div>

      <div class="adm-toolbar">
        <label class="adm-search">
          <span class="adm-vh">Поиск по товарам</span>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input v-model="search" type="search" placeholder="Название или автор" />
        </label>
        <label class="adm-vh" for="f-kind">Вид товара</label>
        <select id="f-kind" v-model="kind" class="adm-select">
          <option value="all">Все виды</option>
          <option value="physical">Физические</option>
          <option value="digital">Цифровые</option>
        </select>
        <label class="adm-vh" for="f-lang">Язык</label>
        <select id="f-lang" v-model="lang" class="adm-select">
          <option value="all">Все языки</option>
          <option v-for="l in contentLocales" :key="l" :value="`hidden-${l}`">
            Скрыты в {{ localeShort[l] }}
          </option>
          <option value="untranslated">Показаны без перевода</option>
        </select>
      </div>

      <div class="adm-legend" aria-label="Обозначения языков">
        <span><span class="adm-lang adm-lang--ok">RU</span> показан и переведён</span>
        <span>
          <span class="adm-lang adm-lang--missing">EN</span> показан, но перевода нет — покажем
          эстонский текст
        </span>
        <span><span class="adm-lang adm-lang--off">EN</span> скрыт в этой версии сайта</span>
        <span v-if="canEdit" class="adm-note">Клик по языку — показать или скрыть</span>
      </div>
      <p v-for="note in emptyInLocale" :key="note" class="adm-note">{{ note }}</p>

      <p v-if="!rows.length" class="adm-note">Товаров пока нет.</p>
      <p v-else-if="!shown.length" class="adm-note">Ничего не нашлось — смените фильтр.</p>

      <div v-else class="adm-table-wrap">
        <table class="adm-table">
          <thead>
            <tr>
              <th scope="col"><span class="adm-vh">Фото</span></th>
              <th scope="col">Товар</th>
              <th scope="col">Вид</th>
              <th scope="col" class="num">Цена</th>
              <th scope="col" class="num">Остаток</th>
              <th scope="col">Языки</th>
              <th scope="col">Статус</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="p in shown"
              :key="p.id"
              :class="{ 'adm-row--hidden': p.state !== 'published' }"
            >
              <td>
                <img
                  v-if="p.cover"
                  class="adm-thumb adm-thumb--book"
                  :src="p.cover.url"
                  alt=""
                  loading="lazy"
                />
                <span v-else class="adm-thumb adm-thumb--empty" aria-hidden="true" />
              </td>
              <td>
                <NuxtLink class="adm-dish__name" :to="`/admin/products/${p.id}`">{{
                  p.name
                }}</NuxtLink>
                <small>{{
                  [categoryName(p.categoryId), p.lead].filter(Boolean).join(' · ')
                }}</small>
              </td>
              <td class="adm-kind">
                {{ kindLabel(p) }}
                <small v-if="p.pickupOnly">только самовывоз</small>
                <small v-if="p.variants > 1">
                  {{ p.variants }} {{ plural(p.variants, ['вариант', 'варианта', 'вариантов']) }}
                </small>
              </td>
              <td class="num">
                <span class="adm-price">{{ price(p) }}</span>
              </td>
              <td class="num nowrap">{{ p.stock === null ? '—' : `${p.stock} шт.` }}</td>
              <td>
                <span class="adm-langs">
                  <component
                    :is="canEdit ? 'button' : 'span'"
                    v-for="l in contentLocales"
                    :key="l"
                    :type="canEdit ? 'button' : undefined"
                    class="adm-lang"
                    :class="langState(p, l).cls"
                    :title="`${localeShort[l]}: ${langState(p, l).text}`"
                    :aria-label="
                      canEdit
                        ? `${p.name}: ${p.locales.includes(l) ? 'скрыть' : 'показать'} в ${localeNames[l]} версии`
                        : undefined
                    "
                    @click="toggleLocale(p, l)"
                  >
                    {{ localeShort[l] }}
                  </component>
                </span>
              </td>
              <td>
                <span class="adm-status" :class="statusClass[p.state]">
                  {{ productStateNames[p.state] }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
