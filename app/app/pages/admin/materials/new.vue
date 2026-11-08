<script setup lang="ts">
// Новый материал: /admin/materials/new?type=event|news|page. После сохранения — в карточку.
import { materialTypes, type MaterialType } from '#shared/materials'

definePageMeta({ layout: 'admin', access: ['materials'] })
defineI18nRoute(false)

const route = useRoute()
const { can } = useAdminUser()

if (!can('materials', 'edit')) await navigateTo('/admin/materials', { replace: true })

const type = computed<MaterialType>(() =>
  materialTypes.includes(route.query.type as MaterialType)
    ? (route.query.type as MaterialType)
    : 'news',
)
useHead({ title: 'Новый материал — админка Peetri Toll' })
// key в шаблоне: «+ Новость» со страницы нового мероприятия — новая форма, а не прежняя
</script>

<template>
  <AdminMaterialForm :key="type" :material="null" :type="type" :can-edit="true" />
</template>
