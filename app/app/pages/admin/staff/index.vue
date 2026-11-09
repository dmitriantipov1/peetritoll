<script setup lang="ts">
// Сотрудники: кто входит в админку и к каким разделам у него доступ (5.2).
// Разметка и классы — из прототипа (admin/staff.html). Раздел видят только админ и владелец.
import { hasFullAccess, roles, sectionKeys, sections } from '#shared/access'
import { momentLabel } from '#shared/dates'
import { staffStatus, type AdminStaffRow } from '#shared/staff'

definePageMeta({ layout: 'admin', access: ['staff'] })
defineI18nRoute(false)
useHead({ title: 'Сотрудники — админка Peetri Toll' })

const { can } = useAdminUser()
const canEdit = computed(() => can('staff', 'edit'))

const { data: list, error } = await useFetch<AdminStaffRow[]>('/api/admin/staff')

/** Разделы с доступом в порядке экрана прав; «правит» выделено */
function accessList(u: AdminStaffRow) {
  return sectionKeys
    .filter((s) => u.permissions[s] && u.permissions[s] !== 'none')
    .map((s) => ({ key: s, label: sections[s].label, edit: u.permissions[s] === 'edit' }))
}
</script>

<template>
  <div>
    <header class="adm-top">
      <div>
        <p class="adm-top__crumb">Люди</p>
        <h1 class="adm-top__title">Сотрудники</h1>
        <p class="adm-top__meta">Раздел видят только админ и владелец</p>
      </div>
      <div v-if="canEdit" class="adm-top__actions">
        <NuxtLink class="btn btn--solid btn--sm" to="/admin/staff/new">
          <svg class="adm-ico" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5v14M5 12h14" /></svg
          >Новый сотрудник
        </NuxtLink>
      </div>
    </header>

    <div class="adm-banner" role="note">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5M12 16v.5" />
      </svg>
      <p>
        Сотрудник входит по своей почте и паролю. Общих учётных записей нет — в истории видно, кто
        что поменял. Ушедшего сотрудника не удаляют, а отключают.
      </p>
    </div>

    <p v-if="error" class="adm-alert" role="alert">
      {{ apiErrorMessage(error, 'Не удалось загрузить список.') }}
    </p>

    <template v-if="list">
      <div class="adm-legend" aria-label="Обозначения доступа">
        <span
          ><span class="adm-access"><span class="is-edit">Товары</span></span> правит</span
        >
        <span
          ><span class="adm-access"><span>Лиды</span></span> только смотрит</span
        >
      </div>

      <div class="adm-table-wrap">
        <table class="adm-table">
          <thead>
            <tr>
              <th scope="col">Сотрудник</th>
              <th scope="col">Роль</th>
              <th scope="col">Доступ</th>
              <th scope="col">Последний вход</th>
              <th scope="col">Статус</th>
              <th scope="col"><span class="adm-vh">Открыть</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in list" :key="u.id" :class="{ 'adm-row--off': !u.isActive }">
              <td>
                <div class="adm-person">
                  <span class="adm-avatar" aria-hidden="true">{{ initials(u.name) }}</span>
                  <div>
                    <NuxtLink class="adm-guest" :to="`/admin/staff/${u.id}`">{{ u.name }}</NuxtLink>
                    <small>{{ u.email }}</small>
                  </div>
                </div>
              </td>
              <td>{{ roles[u.role] }}</td>
              <td>
                <div class="adm-access">
                  <span v-if="hasFullAccess(u.role)" class="is-edit">Все разделы</span>
                  <template v-else>
                    <span v-for="a in accessList(u)" :key="a.key" :class="{ 'is-edit': a.edit }">
                      {{ a.label }}
                    </span>
                    <span v-if="!accessList(u).length">Нет разделов</span>
                  </template>
                </div>
              </td>
              <td class="nowrap">
                <template v-if="u.lastLoginAt">{{ momentLabel(new Date(u.lastLoginAt)) }}</template>
                <small v-else>ещё не входил</small>
              </td>
              <td>
                <span class="adm-status" :class="staffStatus(u).cls">{{
                  staffStatus(u).label
                }}</span>
              </td>
              <td>
                <NuxtLink
                  class="adm-open"
                  :to="`/admin/staff/${u.id}`"
                  :aria-label="`Открыть: ${u.name}`"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>
