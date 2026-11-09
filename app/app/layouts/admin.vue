<script setup lang="ts">
// Макет админки: боковое меню слева, содержимое справа.
// Разметка и классы — из прототипа (admin/index.html). Desktop first, как и там.
// Сюда попадает только вошедший сотрудник: это проверяет middleware/admin.global.ts.
import { adminNav } from '~/utils/admin-nav'
import { roles } from '#shared/access'

// Админка на одном языке, без префикса /et, /en, /ru (5.1)
useHead({
  htmlAttrs: { lang: 'ru' },
  bodyAttrs: { class: 'adm-body' },
  meta: [{ name: 'viewport', content: 'width=1280' }],
})

const { user, canAny, logout } = useAdminUser()

// Раздела без доступа сотрудник не видит в меню; пустую группу тоже не показываем
const nav = computed(() =>
  adminNav
    .map((group) => ({ ...group, items: group.items.filter((item) => canAny(item.access)) }))
    .filter((group) => group.items.length > 0),
)

const userInitials = computed(() => initials(user.value?.name ?? ''))
</script>

<template>
  <div class="adm">
    <aside class="adm-side">
      <NuxtLink class="adm-side__brand" to="/admin" aria-label="Админка Peetri Toll — главная">
        <img src="/images/logo.svg" alt="" width="109" height="57" />
        <span>Админка</span>
      </NuxtLink>

      <nav class="adm-nav" aria-label="Разделы админки">
        <div v-for="group in nav" :key="group.title" class="adm-nav__group">
          <p class="adm-nav__title">{{ group.title }}</p>
          <ul>
            <li v-for="item in group.items" :key="item.to">
              <!-- «Заявки» — корень /admin, поэтому подсветка только при точном совпадении -->
              <NuxtLink class="adm-nav__link" exact-active-class="is-current" :to="item.to">
                <AdminIcon :name="item.icon" />
                {{ item.label }}
              </NuxtLink>
            </li>
          </ul>
        </div>
      </nav>

      <div v-if="user" class="adm-side__user">
        <span class="adm-avatar" aria-hidden="true">{{ userInitials }}</span>
        <div>
          <b>{{ user.name }}</b>
          <span>{{ roles[user.role] }}</span>
        </div>
        <button type="button" @click="logout">Выйти</button>
      </div>
    </aside>

    <main class="adm-main">
      <slot />
    </main>
  </div>
</template>
