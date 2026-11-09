<script setup lang="ts">
// Карточка сотрудника: новый (staff = null) или существующий. Разметка и классы — из прототипа
// (admin/staff-user.html). Кто кого может менять — shared/staff.ts, проверяет и сервер.
// Чего менять нельзя, показывается только для чтения.
import {
  accessLevels,
  roles,
  sectionKeys,
  sections,
  type AccessLevel,
  type Permissions,
  type Role,
  type Section,
} from '#shared/access'
import { fullDate, momentLabel, toTallinnLocal } from '#shared/dates'
import { assignableRoles, canManage, type AdminStaff, type StaffInput } from '#shared/staff'

const props = defineProps<{ staff: AdminStaff | null }>()
const emit = defineEmits<{ saved: [staff: AdminStaff] }>()

const { user: me, can, refresh } = useAdminUser()

const isNew = computed(() => !props.staff)
const self = computed(() => !!props.staff && props.staff.id === me.value?.id)
const myRole = computed<Role>(() => me.value?.role ?? 'staff')

/** Можно ли вообще что-то менять в этой карточке */
const editable = computed(
  () =>
    can('staff', 'edit') &&
    (isNew.value || self.value || canManage(myRole.value, props.staff!.role)),
)
/** Себе роль не меняют — иначе можно случайно остаться без доступа */
const roleEditable = computed(() => editable.value && !self.value)
const roleOptions = computed(() => {
  const list = assignableRoles(myRole.value)
  const current = props.staff?.role
  return current && !list.includes(current) ? [current, ...list] : list
})

// ---------- Состояние формы ----------

function initialState(): StaffInput {
  const s = props.staff
  return {
    name: s?.name ?? '',
    email: s?.email ?? '',
    role: s?.role ?? 'staff',
    permissions: { ...(s?.permissions ?? {}) },
    isActive: s?.isActive ?? true,
  }
}
const form = reactive(initialState())
watch(
  () => props.staff,
  () => Object.assign(form, initialState()),
)

const levelNames: Record<AccessLevel, string> = {
  none: 'нет доступа',
  view: 'смотрит',
  edit: 'правит',
}

/** Разделы по группам, как в меню слева. Заявки — подпункты одной строки «Работа» */
const groups = computed(() => {
  const result: { title: string; items: Section[] }[] = []
  for (const key of sectionKeys) {
    const title = sections[key].group
    let group = result.find((g) => g.title === title)
    if (!group) result.push((group = { title, items: [] }))
    group.items.push(key)
  }
  return result
})

function level(section: Section): AccessLevel {
  return form.permissions[section] ?? 'none'
}
function setLevel(section: Section, value: AccessLevel) {
  // «Нет доступа» храним как отсутствие раздела — лишнее сервер всё равно уберёт
  form.permissions = { ...form.permissions, [section]: value }
}
/** Всем разделам сразу один уровень — быстро завести «смотрит всё» и поправить пару строк */
function setAll(value: AccessLevel) {
  const next: Permissions = {}
  if (value !== 'none') for (const s of sectionKeys) if (s !== 'staff') next[s] = value
  form.permissions = next
}

// ---------- Сохранение ----------

const saving = ref(false)
const error = ref('')
const issues = ref<Record<string, string>>({})

async function save() {
  error.value = ''
  issues.value = {}
  saving.value = true
  try {
    if (props.staff) {
      const saved = await $fetch<AdminStaff>(`/api/admin/staff/${props.staff.id}`, {
        method: 'PUT',
        body: form,
      })
      // Своё имя — и в меню слева
      if (self.value) await refresh()
      emit('saved', saved)
    } else {
      const { id } = await $fetch<{ id: number }>('/api/admin/staff', {
        method: 'POST',
        body: form,
      })
      await navigateTo(`/admin/staff/${id}`, { replace: true })
    }
  } catch (e) {
    error.value = apiErrorMessage(e, 'Не удалось сохранить. Попробуйте ещё раз.')
    issues.value = apiErrorIssues(e)
  } finally {
    saving.value = false
  }
}

/** Отключить или вернуть доступ — сразу, с тем, что сохранено (несохранённые правки не трогаем) */
async function setActive(on: boolean) {
  const s = props.staff
  if (!s) return
  if (
    !on &&
    !confirm(
      `Отключить доступ: ${s.name}? Войти больше не получится, открытые сессии закроются. ` +
        'Имя останется в истории, вернуть доступ можно здесь же.',
    )
  )
    return
  error.value = ''
  try {
    const saved = await $fetch<AdminStaff>(`/api/admin/staff/${s.id}`, {
      method: 'PUT',
      body: {
        name: s.name,
        email: s.email,
        role: s.role,
        permissions: s.permissions,
        isActive: on,
      } satisfies StaffInput,
    })
    emit('saved', saved)
  } catch (e) {
    error.value = apiErrorMessage(e, 'Не удалось. Попробуйте ещё раз.')
  }
}

// ---------- Подписи ----------

const title = computed(() => props.staff?.name || form.name.trim() || 'Новый сотрудник')

const status = computed(() => {
  const s = props.staff
  if (!s) return null
  if (!s.isActive) return { label: 'Отключён', cls: 'adm-status--archive' }
  if (!s.hasPassword) return { label: 'Приглашён', cls: 'adm-status--planned' }
  return { label: 'Активен', cls: 'adm-status--done' }
})

const meta = computed(() => {
  const s = props.staff
  if (!s) return 'Пароль сотрудник задаст сам по ссылке-приглашению'
  const parts = [roles[s.role], `в админке с ${fullDate(toTallinnLocal(new Date(s.createdAt)))}`]
  if (s.lastLoginAt) parts.push(`последний вход ${momentLabel(new Date(s.lastLoginAt))}`)
  return parts.join(' · ')
})

const readOnlyNote = computed(() => {
  if (editable.value || !props.staff) return ''
  if (!can('staff', 'edit')) return 'У вас доступ только на просмотр.'
  return `Учётную запись с ролью «${roles[props.staff.role]}» может менять только админ.`
})
</script>

<template>
  <form @submit.prevent="save">
    <header class="adm-top">
      <div>
        <NuxtLink class="adm-back" to="/admin/staff">← Сотрудники</NuxtLink>
        <h1 class="adm-top__title">
          {{ title }}
          <span v-if="status" class="adm-status" :class="status.cls">{{ status.label }}</span>
        </h1>
        <p class="adm-top__meta">{{ meta }}</p>
      </div>
      <div v-if="editable" class="adm-top__actions">
        <NuxtLink class="btn btn--sm" to="/admin/staff">Отмена</NuxtLink>
        <button class="btn btn--solid btn--sm" type="submit" :disabled="saving">
          {{ saving ? 'Сохраняем…' : isNew ? 'Создать' : 'Сохранить' }}
        </button>
      </div>
    </header>

    <p v-if="error" class="adm-alert" role="alert">{{ error }}</p>
    <p v-if="readOnlyNote" class="adm-note">{{ readOnlyNote }}</p>

    <div class="adm-layout">
      <div class="adm-stack">
        <section class="adm-panel" aria-labelledby="p-user">
          <div class="adm-panel__head">
            <h2 id="p-user" class="adm-panel__title">Сотрудник</h2>
          </div>
          <fieldset class="form adm-fieldset" :disabled="!editable">
            <div class="field">
              <label for="u-name">Имя</label>
              <input id="u-name" v-model="form.name" type="text" maxlength="100" required />
              <span v-if="issues.name" class="adm-note adm-danger">{{ issues.name }}</span>
            </div>
            <div class="field">
              <label for="u-mail">E-mail для входа</label>
              <input
                id="u-mail"
                v-model="form.email"
                type="email"
                maxlength="200"
                autocomplete="off"
                required
              />
              <span v-if="issues.email" class="adm-note adm-danger">{{ issues.email }}</span>
            </div>
            <div class="field">
              <label for="u-role">Роль</label>
              <select id="u-role" v-model="form.role" :disabled="!roleEditable">
                <option v-for="r in roleOptions" :key="r" :value="r">{{ roles[r] }}</option>
              </select>
              <span v-if="self" class="adm-note">Свою роль поменять нельзя</span>
              <span v-else class="adm-note">
                Админ и владелец видят всё; сотрудник — только разделы, которые выданы ниже
              </span>
            </div>
          </fieldset>
        </section>

        <section class="adm-panel" aria-labelledby="p-perm">
          <div class="adm-panel__head">
            <h2 id="p-perm" class="adm-panel__title">Права по разделам</h2>
            <span v-if="editable && form.role === 'staff'" class="adm-staff-quick">
              <button class="adm-link-btn" type="button" @click="setAll('view')">
                Всё «смотрит»
              </button>
              <button class="adm-link-btn" type="button" @click="setAll('none')">Снять всё</button>
            </span>
          </div>

          <p v-if="form.role !== 'staff'" class="adm-note">
            {{ roles[form.role] }} видит и правит все разделы — выдавать права не нужно.
          </p>
          <template v-else>
            <table class="adm-perm">
              <thead>
                <tr>
                  <th scope="col">Раздел</th>
                  <th v-for="l in accessLevels" :key="l" scope="col">
                    {{ levelNames[l][0]!.toUpperCase() + levelNames[l].slice(1) }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <template v-for="g in groups" :key="g.title">
                  <tr class="adm-perm__group">
                    <td colspan="4">{{ g.title }}</td>
                  </tr>
                  <tr
                    v-for="s in g.items"
                    :key="s"
                    :class="{ 'is-sub': s.startsWith('requests.'), 'is-locked': s === 'staff' }"
                  >
                    <td>
                      <b>{{ sections[s].label }}</b>
                      <small v-if="'note' in sections[s]">{{ sections[s].note }}</small>
                    </td>
                    <td v-for="l in accessLevels" :key="l">
                      <input
                        type="radio"
                        :name="`perm-${s}`"
                        :checked="s === 'staff' ? l === 'none' : level(s) === l"
                        :disabled="!editable || s === 'staff'"
                        :aria-label="`${sections[s].label}: ${levelNames[l]}`"
                        @change="setLevel(s, l)"
                      />
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
            <p class="adm-note" style="margin-top: 14px">
              Раздела без доступа сотрудник не видит в меню слева. «Смотрит» — открывает, но не
              меняет и не удаляет. Новые права действуют сразу, без повторного входа.
            </p>
          </template>
        </section>
      </div>

      <aside class="adm-stack" aria-label="Вход и доступ">
        <section class="adm-panel" aria-labelledby="p-login">
          <h2 id="p-login" class="adm-panel__title" style="margin-bottom: 14px">Вход</h2>
          <dl v-if="staff" class="adm-facts">
            <div>
              <dt>Пароль</dt>
              <dd>
                <template v-if="staff.passwordChangedAt">
                  Задан {{ fullDate(toTallinnLocal(new Date(staff.passwordChangedAt))) }}
                </template>
                <template v-else>Ещё не задан</template>
              </dd>
            </div>
            <div>
              <dt>Последний вход</dt>
              <dd>
                {{ staff.lastLoginAt ? momentLabel(new Date(staff.lastLoginAt)) : 'Ещё не входил' }}
              </dd>
            </div>
          </dl>
          <p class="adm-note" style="margin-top: 10px">
            Пароль сотрудника никто не видит и не задаёт за него: он задаёт его сам по ссылке.
            Ссылки «пригласить» и «новый пароль» — в следующем обновлении.
          </p>
        </section>

        <section v-if="staff && editable && !self" class="adm-panel" aria-labelledby="p-off">
          <h2 id="p-off" class="adm-panel__title" style="margin-bottom: 14px">
            {{ staff.isActive ? 'Отключить' : 'Вернуть доступ' }}
          </h2>
          <template v-if="staff.isActive">
            <p class="adm-note">
              Сотрудник больше не сможет войти, открытые сессии закроются. Имя останется в истории —
              удалять учётную запись не нужно.
            </p>
            <div class="adm-actions">
              <button class="btn btn--sm adm-danger" type="button" @click="setActive(false)">
                Отключить доступ…
              </button>
            </div>
          </template>
          <template v-else>
            <p class="adm-note">Сотрудник снова сможет войти со своим прежним паролем.</p>
            <div class="adm-actions">
              <button class="btn btn--sm" type="button" @click="setActive(true)">
                Вернуть доступ
              </button>
            </div>
          </template>
        </section>
      </aside>
    </div>
  </form>
</template>
