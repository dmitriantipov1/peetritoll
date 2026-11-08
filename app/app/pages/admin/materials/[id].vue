<script setup lang="ts">
// Карточка материала: новость, мероприятие или страница.
import type { AdminMaterial } from '#shared/materials'

definePageMeta({ layout: 'admin', access: ['materials'] })
defineI18nRoute(false)

const route = useRoute()
const { can } = useAdminUser()

const { data: material, error } = await useFetch<AdminMaterial>(
  () => `/api/admin/materials/${route.params.id}`,
)

useHead({
  title: () =>
    `${material.value?.translations.ru?.title ?? material.value?.translations.et?.title ?? 'Материал'} — админка Peetri Toll`,
})

const saved = ref(false)
function onSaved(value: AdminMaterial) {
  material.value = value
  saved.value = true
  setTimeout(() => (saved.value = false), 3000)
}
</script>

<template>
  <div>
    <template v-if="error">
      <NuxtLink class="adm-back" to="/admin/materials">← Новости и мероприятия</NuxtLink>
      <p class="adm-alert" role="alert">
        {{ apiErrorMessage(error, 'Не удалось загрузить материал.') }}
      </p>
    </template>
    <p v-if="saved" class="adm-alert" role="status">Сохранено.</p>
    <AdminMaterialForm
      v-if="material"
      :material="material"
      :can-edit="can('materials', 'edit')"
      @saved="onSaved"
    />
  </div>
</template>
