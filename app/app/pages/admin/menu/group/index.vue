<script setup lang="ts">
// Групповое меню — «Трапезы групп» (7.1, ответы заказчицы 12.11.2026): готовые комплексные
// обеды карточками на сайте и форма запроса. Калькулятора нет. Обед — components/AdminGroupMenuForm.vue
import {
  menuItemLines,
  type AdminGroupMenu,
  type AdminGroupMenus,
  type GroupSettings,
} from '#shared/group-menus'
import type { Localized } from '#shared/menu'
import { pickTranslation } from '#shared/locales'
import { formatPrice } from '#shared/money'

definePageMeta({ layout: 'admin', access: ['menu'] })
defineI18nRoute(false)
useHead({ title: 'Групповое меню — админка Peetri Toll' })

const { can } = useAdminUser()
const canEdit = computed(() => can('menu', 'edit'))

const { data, error, refresh } = await useFetch<AdminGroupMenus>('/api/admin/group-menus', {
  deep: true,
})

const name = (names: Localized<string>) =>
  pickTranslation(
    Object.entries(names).map(([locale, text]) => ({ locale, text: text ?? '' })),
    'ru',
  )?.text ?? ''

/** Состав одной строкой: «Солянка · Пирожок с капустой · Вода…» */
const itemsLine = (m: AdminGroupMenu) =>
  menuItemLines(m.items.ru || m.items.et || m.items.en).join(' · ')

const notice = ref('')

async function toggleVisible(menu: AdminGroupMenu) {
  notice.value = ''
  menu.isVisible = !menu.isVisible // сразу, не дожидаясь сервера
  try {
    await $fetch<unknown>(`/api/admin/group-menus/${menu.id}/visibility`, {
      method: 'PATCH',
      body: { isVisible: menu.isVisible },
    })
  } catch (e) {
    notice.value = apiErrorMessage(e, 'Не удалось сохранить. Попробуйте ещё раз.')
    await refresh()
  }
}

// ---------- Настройки ----------

const settings = ref<GroupSettings | null>(data.value ? { ...data.value.settings } : null)
watch(
  () => data.value?.settings,
  (s) => {
    if (s) settings.value = { ...s }
  },
)
const settingsMessage = ref('')
const settingsError = ref('')

async function saveSettings() {
  settingsMessage.value = ''
  settingsError.value = ''
  try {
    settings.value = await $fetch<GroupSettings>('/api/admin/group-menus/settings', {
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
      <div v-if="canEdit" class="adm-top__actions">
        <NuxtLink class="btn btn--solid btn--sm" to="/admin/menu/group/new">Добавить обед</NuxtLink>
      </div>
    </header>

    <AdminMenuTabs current="group" />

    <p v-if="error" class="adm-alert" role="alert">
      {{ apiErrorMessage(error, 'Не удалось загрузить меню.') }}
    </p>
    <p v-if="!canEdit" class="adm-alert" role="note">У вас право только смотреть меню.</p>
    <p v-if="notice" class="adm-alert" role="alert">{{ notice }}</p>

    <div v-if="data && settings" class="adm-layout">
      <section class="adm-panel" aria-labelledby="p-meals" style="padding-bottom: 8px">
        <div class="adm-panel__head">
          <h2 id="p-meals" class="adm-panel__title">Трапезы групп</h2>
          <p class="adm-panel__hint">
            Карточки на странице «Устроителям путешествий»; порядок — по номеру
          </p>
        </div>

        <p v-if="!data.menus.length" class="adm-note" style="padding-bottom: 12px">
          Обедов пока нет. Добавьте первый — номер, название, состав и цену с человека.
        </p>

        <table v-else class="adm-table">
          <thead>
            <tr>
              <th scope="col" class="num">№</th>
              <th scope="col">Обед</th>
              <th scope="col" class="num">С человека</th>
              <th scope="col">Переводы</th>
              <th scope="col">Видимость</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in data.menus" :key="m.id" :class="{ 'adm-row--hidden': !m.isVisible }">
              <td class="num">{{ m.number }}</td>
              <td>
                <NuxtLink class="adm-dish__name" :to="`/admin/menu/group/${m.id}`">
                  {{ name(m.names) }}
                </NuxtLink>
                <small>{{ itemsLine(m) || 'состав не заполнен' }}</small>
              </td>
              <td class="num">
                <span class="adm-price">{{ formatPrice(m.priceCents) }}</span>
              </td>
              <td>
                <AdminLangBadges :has="(l) => !!m.names[l] && !!m.items[l]" />
              </td>
              <td>
                <label class="adm-switch">
                  <input
                    type="checkbox"
                    :checked="m.isVisible"
                    :disabled="!canEdit"
                    :aria-label="`На сайте: ${name(m.names)}`"
                    @change="toggleVisible(m)"
                  />
                  <span class="adm-switch__track" />
                  {{ m.isVisible ? 'На сайте' : 'Скрыт' }}
                </label>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <aside class="adm-stack" aria-label="Настройки группового меню">
        <section class="adm-panel" aria-labelledby="p-group-set">
          <h2 id="p-group-set" class="adm-panel__title" style="margin-bottom: 14px">
            Запрос группы
          </h2>
          <form @submit.prevent="saveSettings">
            <fieldset
              :disabled="!canEdit"
              class="adm-stack"
              style="gap: 16px; border: 0; padding: 0; margin: 0"
            >
              <div class="field">
                <label for="g-min">Минимум человек в группе</label>
                <input id="g-min" v-model.number="settings.minPeople" type="number" min="1" />
              </div>
              <div class="field">
                <label for="g-hours">Заказ не позже чем за, часов до приезда</label>
                <input id="g-hours" v-model.number="settings.leadHours" type="number" min="0" />
              </div>
            </fieldset>
            <p v-if="settingsError" class="adm-note adm-danger" role="alert">{{ settingsError }}</p>
            <p v-if="settingsMessage" class="adm-note" role="status">{{ settingsMessage }}</p>
            <div v-if="canEdit" style="margin-top: 14px">
              <button class="btn btn--sm" type="submit">Сохранить настройки</button>
            </div>
          </form>
        </section>
        <p class="adm-note">
          Группа выбирает обед в форме запроса или пишет «обсудим по телефону». Заявка приходит в
          «Заявки» с типом «Группа»: обед, цена с человека и сумма на всех — снимком на момент
          отправки.
        </p>
      </aside>
    </div>
  </div>
</template>
