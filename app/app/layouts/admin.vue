<script setup lang="ts">
// Макет админки: боковое меню слева, содержимое справа.
// Разметка и классы — из прототипа (admin/index.html). Desktop first, как и там.
import { adminNav } from '~/utils/admin-nav'

useHead({
  bodyAttrs: { class: 'adm-body' },
  meta: [{ name: 'viewport', content: 'width=1280' }],
})
</script>

<template>
  <div class="adm">
    <aside class="adm-side">
      <NuxtLink class="adm-side__brand" to="/admin" aria-label="Админка Peetri Toll — заявки">
        <img src="/images/logo.svg" alt="" width="109" height="57" />
        <span>Админка</span>
      </NuxtLink>

      <nav class="adm-nav" aria-label="Разделы админки">
        <div v-for="group in adminNav" :key="group.title" class="adm-nav__group">
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

      <!-- Пользователь — заглушка до входа в админку (шаг 0.6) -->
      <div class="adm-side__user">
        <span class="adm-avatar" aria-hidden="true">ОП</span>
        <div><b>Ольга Петрова</b><span>Владелец</span></div>
        <a href="#">Выйти</a>
      </div>
    </aside>

    <main class="adm-main">
      <slot />
    </main>
  </div>
</template>
