<script setup lang="ts">
// Категории и отметки основного меню (7.1): правка на месте, по строке на запись.
// Порядок перетаскиванием — следующим слоем.
import type { AdminMenu, Localized, MarkKind } from '#shared/menu'

definePageMeta({ layout: 'admin', access: ['menu'] })
defineI18nRoute(false)
useHead({ title: 'Категории и отметки — админка Peetri Toll' })

const { can } = useAdminUser()
const canEdit = computed(() => can('menu', 'edit'))

const { data: menu, error, refresh } = await useFetch<AdminMenu>('/api/admin/menu')

// Сколько блюд с каждой отметкой
const usage = computed(() => {
  const diet = new Map<number, number>()
  const labels = new Map<number, number>()
  for (const c of menu.value?.categories ?? []) {
    for (const d of c.dishes) {
      d.dietTagIds.forEach((id) => diet.set(id, (diet.get(id) ?? 0) + 1))
      d.labelIds.forEach((id) => labels.set(id, (labels.get(id) ?? 0) + 1))
    }
  }
  return { diet, labels }
})

// Строки «новая запись», которые ещё не сохранены
const adding = reactive({ category: false, diet: false, labels: false })

type Done = (error?: string) => void
type Payload = { names: Localized<string>; isVisible: boolean }

/** Запрос к API; ошибку отдаём строке, при успехе — перечитываем меню */
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

// Адрес — обычной строкой и тип ответа явно: иначе типизация маршрутов в $fetch
// уходит в слишком глубокую проверку (TS2321)
function saveCategory(id: number | null, { names, isVisible }: Payload, done: Done) {
  const url: string =
    id === null ? '/api/admin/menu/categories' : `/api/admin/menu/categories/${id}`
  run(
    () =>
      $fetch<unknown>(url, { method: id === null ? 'POST' : 'PUT', body: { names, isVisible } }),
    done,
    () => (adding.category = false),
  )
}

function removeCategory(id: number, name: string, done: Done) {
  if (!confirm(`Удалить категорию «${name}»?`)) return done()
  run(() => $fetch<unknown>(`/api/admin/menu/categories/${id}`, { method: 'DELETE' }), done)
}

function saveMark(kind: MarkKind, id: number | null, { names }: Payload, done: Done) {
  const url: string = `/api/admin/menu/marks/${kind}${id === null ? '' : `/${id}`}`
  run(
    () => $fetch<unknown>(url, { method: id === null ? 'POST' : 'PUT', body: { names } }),
    done,
    () => (adding[kind] = false),
  )
}

function removeMark(kind: MarkKind, id: number, name: string, used: number, done: Done) {
  const note = used ? ` Она снимется с ${used} ${used === 1 ? 'блюда' : 'блюд'}.` : ''
  if (!confirm(`Удалить отметку «${name}»?${note}`)) return done()
  run(() => $fetch<unknown>(`/api/admin/menu/marks/${kind}/${id}`, { method: 'DELETE' }), done)
}

const firstName = (names: Localized<string>) => names.ru || names.et || names.en || ''

const markPanels = computed(() => [
  {
    kind: 'diet' as const,
    anchor: 'marks',
    title: 'Отметки для гостей',
    hint: 'Видны на карточке блюда, по ним гости фильтруют меню: вегетарианское, без лактозы…',
    items: menu.value?.dietTags ?? [],
    usage: usage.value.diet,
  },
  {
    kind: 'labels' as const,
    anchor: 'labels',
    title: 'Отметки',
    hint: 'Значок на карточке блюда, без фильтра: новинка, детское…',
    items: menu.value?.labels ?? [],
    usage: usage.value.labels,
  },
])
</script>

<template>
  <div>
    <header class="adm-top">
      <div>
        <NuxtLink class="adm-back" to="/admin/menu">← Меню</NuxtLink>
        <h1 class="adm-top__title">Категории и отметки</h1>
        <p class="adm-top__meta">
          Основное меню · если перевода нет, на сайте покажем эстонское название
        </p>
      </div>
    </header>

    <p v-if="error" class="adm-alert" role="alert">
      {{ apiErrorMessage(error, 'Не удалось загрузить меню.') }}
    </p>
    <p v-if="!canEdit" class="adm-alert" role="note">У вас право только смотреть меню.</p>

    <div v-if="menu" class="adm-stack">
      <section id="categories" class="adm-panel" aria-labelledby="p-cats">
        <div class="adm-panel__head">
          <h2 id="p-cats" class="adm-panel__title">Категории</h2>
          <p class="adm-panel__hint">Удалить можно только пустую категорию</p>
        </div>
        <div class="adm-table-wrap">
          <table class="adm-table">
            <thead>
              <tr>
                <th scope="col">ET</th>
                <th scope="col">EN</th>
                <th scope="col">RU</th>
                <th scope="col">Видимость</th>
                <th scope="col" class="num">Блюд</th>
                <th scope="col"><span class="adm-vh">Действия</span></th>
              </tr>
            </thead>
            <tbody>
              <AdminNamesRow
                v-for="c in menu.categories"
                :id="c.id"
                :key="c.id"
                :names="c.names"
                :is-visible="c.isVisible"
                with-visibility
                :count="c.dishes.length"
                :can-edit="canEdit"
                :delete-blocked="c.dishes.length ? 'Сначала перенесите или удалите блюда' : ''"
                @save="(p, done) => saveCategory(c.id, p, done)"
                @remove="(done) => removeCategory(c.id, firstName(c.names), done)"
              />
              <AdminNamesRow
                v-if="adding.category"
                :id="null"
                :names="{}"
                with-visibility
                :can-edit="canEdit"
                @save="(p, done) => saveCategory(null, p, done)"
                @cancel="adding.category = false"
              />
            </tbody>
          </table>
        </div>
        <p v-if="canEdit && !adding.category" style="margin-top: 14px">
          <button class="adm-link-btn" type="button" @click="adding.category = true">
            + Добавить категорию
          </button>
        </p>
      </section>

      <section
        v-for="panel in markPanels"
        :id="panel.anchor"
        :key="panel.kind"
        class="adm-panel"
        :aria-labelledby="`p-${panel.kind}`"
      >
        <div class="adm-panel__head">
          <h2 :id="`p-${panel.kind}`" class="adm-panel__title">{{ panel.title }}</h2>
          <p class="adm-panel__hint">{{ panel.hint }}</p>
        </div>
        <div class="adm-table-wrap">
          <table class="adm-table">
            <thead>
              <tr>
                <th scope="col">ET</th>
                <th scope="col">EN</th>
                <th scope="col">RU</th>
                <th scope="col" class="num">Блюд</th>
                <th scope="col"><span class="adm-vh">Действия</span></th>
              </tr>
            </thead>
            <tbody>
              <AdminNamesRow
                v-for="m in panel.items"
                :id="m.id"
                :key="m.id"
                :names="m.names"
                :count="panel.usage.get(m.id) ?? 0"
                :can-edit="canEdit"
                @save="(p, done) => saveMark(panel.kind, m.id, p, done)"
                @remove="
                  (done) =>
                    removeMark(
                      panel.kind,
                      m.id,
                      firstName(m.names),
                      panel.usage.get(m.id) ?? 0,
                      done,
                    )
                "
              />
              <AdminNamesRow
                v-if="adding[panel.kind]"
                :id="null"
                :names="{}"
                :can-edit="canEdit"
                @save="(p, done) => saveMark(panel.kind, null, p, done)"
                @cancel="adding[panel.kind] = false"
              />
            </tbody>
          </table>
        </div>
        <p v-if="canEdit && !adding[panel.kind]" style="margin-top: 14px">
          <button class="adm-link-btn" type="button" @click="adding[panel.kind] = true">
            + Добавить отметку
          </button>
        </p>
      </section>
    </div>
  </div>
</template>
