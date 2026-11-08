<script setup lang="ts">
// Карточка блюда основного меню.
import type { AdminDishDetails, AdminMenu } from '#shared/menu'

definePageMeta({ layout: 'admin', access: ['menu'] })
defineI18nRoute(false)

const route = useRoute()
const { can } = useAdminUser()

const id = computed(() => Number(route.params.id))

const [{ data: dish, error: dishError }, { data: menu, error: menuError }] = await Promise.all([
  useFetch<AdminDishDetails>(() => `/api/admin/menu/dishes/${id.value}`),
  useFetch<AdminMenu>('/api/admin/menu'),
])

const error = computed(() => dishError.value ?? menuError.value)

useHead({
  title: () =>
    `${dish.value?.translations.ru?.name ?? dish.value?.translations.et?.name ?? 'Блюдо'} — админка Peetri Toll`,
})

const saved = ref(false)
function onSaved(value: AdminDishDetails) {
  dish.value = value
  saved.value = true
  setTimeout(() => (saved.value = false), 3000)
}
</script>

<template>
  <div>
    <template v-if="error">
      <NuxtLink class="adm-back" to="/admin/menu">← Меню</NuxtLink>
      <p class="adm-alert" role="alert">
        {{ apiErrorMessage(error, 'Не удалось загрузить блюдо.') }}
      </p>
    </template>
    <p v-if="saved" class="adm-alert" role="status">Сохранено.</p>
    <AdminDishForm
      v-if="dish && menu"
      :dish="dish"
      :menu="menu"
      :can-edit="can('menu', 'edit')"
      @saved="onSaved"
    />
  </div>
</template>
