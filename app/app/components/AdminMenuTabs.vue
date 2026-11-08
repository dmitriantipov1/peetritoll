<script setup lang="ts">
// Вкладки видов меню в админке (admin/menu.html прототипа). Вкладку без прав не показываем.
defineProps<{
  current: 'main' | 'lunch' | 'banquet' | 'group'
  /** Подпись под вкладкой «Основное», например «37 блюд» */
  mainNote?: string
}>()

const { can } = useAdminUser()
</script>

<template>
  <ul class="adm-tabs" aria-label="Виды меню">
    <li v-if="can('menu')">
      <NuxtLink to="/admin/menu" :aria-current="current === 'main' ? 'page' : undefined">
        Основное<small v-if="mainNote">{{ mainNote }}</small>
      </NuxtLink>
    </li>
    <li v-if="can('menu.lunch')">
      <NuxtLink to="/admin/menu/lunch" :aria-current="current === 'lunch' ? 'page' : undefined">
        Дневное<small>неделя</small>
      </NuxtLink>
    </li>
    <template v-if="can('menu')">
      <li>
        <NuxtLink
          to="/admin/menu/banquet"
          :aria-current="current === 'banquet' ? 'page' : undefined"
        >
          Банкетное
        </NuxtLink>
      </li>
      <li>
        <NuxtLink to="/admin/menu/group" :aria-current="current === 'group' ? 'page' : undefined">
          Групповое
        </NuxtLink>
      </li>
    </template>
  </ul>
</template>
