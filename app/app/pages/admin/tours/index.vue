<script setup lang="ts">
// Экскурсионные программы (20.11.2026): карточки «Наши экскурсионные программы» на странице
// «Экскурсии и поездки». Порядок — перетаскиванием, «на сайте» — переключателем.
// Программа — components/AdminTourForm.vue
import { VueDraggable } from 'vue-draggable-plus'
import { tourPriceUnitNames, tourTitleRu, type AdminTour } from '#shared/tours'
import { formatPrice } from '#shared/money'

definePageMeta({ layout: 'admin', access: ['tours'] })
defineI18nRoute(false)
useHead({ title: 'Экскурсии — админка Peetri Toll' })

const { can } = useAdminUser()
const canEdit = computed(() => can('tours', 'edit'))

const { data, error, refresh } = await useFetch<AdminTour[]>('/api/admin/tours', { deep: true })
const list = ref<AdminTour[]>([])
watch(data, (v) => (list.value = v ? [...v] : []), { immediate: true })

const notice = ref('')

/** «60 минут · 50,00 € за группу · от 12 человек» */
function meta(t: AdminTour) {
  return [
    t.durations.ru || t.durations.et || t.durations.en,
    `${formatPrice(t.priceCents)} ${tourPriceUnitNames[t.priceUnit]}`,
    t.minPeople ? `от ${t.minPeople} чел.` : '',
  ]
    .filter(Boolean)
    .join(' · ')
}

async function toggleVisible(tour: AdminTour) {
  notice.value = ''
  tour.isVisible = !tour.isVisible // сразу, не дожидаясь сервера
  try {
    await $fetch<unknown>(`/api/admin/tours/${tour.id}/visibility`, {
      method: 'PATCH',
      body: { isVisible: tour.isVisible },
    })
  } catch (e) {
    notice.value = apiErrorMessage(e, 'Не удалось сохранить. Попробуйте ещё раз.')
    await refresh()
  }
}

async function saveOrder() {
  notice.value = ''
  try {
    await $fetch<unknown>('/api/admin/tours/order', {
      method: 'PUT',
      body: { ids: list.value.map((t) => t.id) },
    })
  } catch (e) {
    notice.value = apiErrorMessage(e, 'Не удалось сохранить порядок. Попробуйте ещё раз.')
    await refresh()
  }
}
</script>

<template>
  <div>
    <header class="adm-top">
      <div>
        <p class="adm-top__crumb">Содержимое</p>
        <h1 class="adm-top__title">Экскурсии</h1>
      </div>
      <div v-if="canEdit" class="adm-top__actions">
        <NuxtLink class="btn btn--solid btn--sm" to="/admin/tours/new">Добавить программу</NuxtLink>
      </div>
    </header>

    <p v-if="error" class="adm-alert" role="alert">
      {{ apiErrorMessage(error, 'Не удалось загрузить программы.') }}
    </p>
    <p v-if="!canEdit" class="adm-alert" role="note">У вас право только смотреть программы.</p>
    <p v-if="notice" class="adm-alert" role="alert">{{ notice }}</p>

    <section v-if="data" class="adm-panel" aria-labelledby="p-tours" style="padding-bottom: 8px">
      <div class="adm-panel__head">
        <h2 id="p-tours" class="adm-panel__title">Наши экскурсионные программы</h2>
        <p class="adm-panel__hint">
          Карточки на странице «Экскурсии и поездки» в этом порядке; гость выбирает программу в
          форме заявки
        </p>
      </div>

      <p v-if="!list.length" class="adm-note" style="padding-bottom: 12px">
        Программ пока нет. Добавьте первую — название, описание, длительность, цену, гида и языки.
      </p>

      <table v-else class="adm-table">
        <thead>
          <tr>
            <th v-if="canEdit" scope="col"><span class="visually-hidden">Порядок</span></th>
            <th scope="col"><span class="visually-hidden">Фото</span></th>
            <th scope="col">Программа</th>
            <th scope="col">Гид</th>
            <th scope="col">Переводы</th>
            <th scope="col">Видимость</th>
          </tr>
        </thead>
        <VueDraggable
          v-model="list"
          tag="tbody"
          handle=".adm-drag"
          :animation="150"
          :disabled="!canEdit"
          @end="saveOrder"
        >
          <tr v-for="t in list" :key="t.id" :class="{ 'adm-row--hidden': !t.isVisible }">
            <td v-if="canEdit">
              <span class="adm-drag" title="Перетащите, чтобы поменять порядок">
                <AdminDragIcon />
              </span>
            </td>
            <td>
              <img
                v-if="t.photo || t.legacyPhoto"
                class="adm-thumb"
                :src="t.photo?.url ?? t.legacyPhoto ?? ''"
                :srcset="t.photo?.srcset"
                sizes="56px"
                alt=""
              />
              <span v-else class="adm-thumb adm-thumb--empty" />
            </td>
            <td>
              <NuxtLink class="adm-dish__name" :to="`/admin/tours/${t.id}`">
                {{ tourTitleRu(t.titles) }}
              </NuxtLink>
              <small>{{ meta(t) }}</small>
            </td>
            <td>{{ t.guide || '—' }}</td>
            <td>
              <AdminLangBadges :has="(l) => !!t.titles[l] && !!t.texts[l]" />
            </td>
            <td>
              <label class="adm-switch">
                <input
                  type="checkbox"
                  :checked="t.isVisible"
                  :disabled="!canEdit"
                  :aria-label="`На сайте: ${tourTitleRu(t.titles)}`"
                  @change="toggleVisible(t)"
                />
                <span class="adm-switch__track" />
                {{ t.isVisible ? 'На сайте' : 'Скрыта' }}
              </label>
            </td>
          </tr>
        </VueDraggable>
      </table>
    </section>
  </div>
</template>
