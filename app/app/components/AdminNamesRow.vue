<script setup lang="ts">
// Строка справочника с правкой на месте: название на трёх языках, для категорий — «На сайте».
// Используется на экране «Категории и отметки» (pages/admin/menu/setup.vue).
import { contentLocales, type ContentLocale } from '#shared/locales'
import type { Localized } from '#shared/menu'

const props = withDefaults(
  defineProps<{
    /** null — новая строка, ещё не сохранённая */
    id: number | null
    names: Localized<string>
    isVisible?: boolean
    /** Показывать переключатель «На сайте» (у категорий) */
    withVisibility?: boolean
    /** Сколько блюд в категории или с отметкой */
    count?: number
    canEdit: boolean
    /** Почему нельзя удалить — текст подсказки; пусто — можно */
    deleteBlocked?: string
  }>(),
  // Не переданное логическое свойство Vue считает false — новая категория была бы скрытой
  { isVisible: true, count: 0, deleteBlocked: '' },
)

const emit = defineEmits<{
  save: [payload: { names: Localized<string>; isVisible: boolean }, done: (error?: string) => void]
  remove: [done: (error?: string) => void]
  cancel: []
}>()

const names = reactive(
  Object.fromEntries(contentLocales.map((l) => [l, props.names[l] ?? ''])) as Record<
    ContentLocale,
    string
  >,
)
const visible = ref(props.isVisible)
const busy = ref(false)
const error = ref('')

const dirty = computed(
  () =>
    props.id === null ||
    contentLocales.some((l) => names[l].trim() !== (props.names[l] ?? '')) ||
    (props.withVisibility && visible.value !== props.isVisible),
)

function payload() {
  return {
    names: Object.fromEntries(
      contentLocales.filter((l) => names[l].trim()).map((l) => [l, names[l].trim()]),
    ) as Localized<string>,
    isVisible: visible.value,
  }
}

function save() {
  busy.value = true
  error.value = ''
  emit('save', payload(), (e) => {
    busy.value = false
    error.value = e ?? ''
  })
}

function remove() {
  busy.value = true
  error.value = ''
  emit('remove', (e) => {
    busy.value = false
    error.value = e ?? ''
  })
}
</script>

<template>
  <tr :class="{ 'adm-row--hidden': withVisibility && !visible }">
    <td v-for="l in contentLocales" :key="l">
      <div class="field">
        <label class="adm-vh" :for="`n-${id ?? 'new'}-${l}`">{{ l.toUpperCase() }}</label>
        <input
          :id="`n-${id ?? 'new'}-${l}`"
          v-model="names[l]"
          type="text"
          maxlength="100"
          :disabled="!canEdit"
          :placeholder="l === 'et' ? 'Eesti keeles' : l === 'en' ? 'In English' : 'По-русски'"
        />
      </div>
    </td>
    <td v-if="withVisibility">
      <label class="adm-switch">
        <input
          v-model="visible"
          type="checkbox"
          :disabled="!canEdit"
          aria-label="Показывать на сайте"
        />
        <span class="adm-switch__track" />
        {{ visible ? 'На сайте' : 'Скрыто' }}
      </label>
    </td>
    <td class="num">{{ id === null ? '—' : count }}</td>
    <td class="nowrap">
      <div v-if="canEdit" class="adm-row-actions">
        <button
          v-if="dirty"
          class="adm-link-btn adm-link-btn--strong"
          type="button"
          :disabled="busy"
          @click="save"
        >
          {{ id === null ? 'Добавить' : 'Сохранить' }}
        </button>
        <button v-if="id === null" class="adm-link-btn" type="button" @click="emit('cancel')">
          Отмена
        </button>
        <button
          v-else
          class="adm-link-btn adm-danger"
          type="button"
          :disabled="busy || !!deleteBlocked"
          :title="deleteBlocked"
          @click="remove"
        >
          Удалить
        </button>
      </div>
      <p v-if="error" class="adm-note adm-danger" role="alert">{{ error }}</p>
    </td>
  </tr>
</template>
