<script setup lang="ts">
// Вход для сотрудников. Разметка и классы — из прототипа (admin/login.html).
import { firstAllowedPath } from '~/utils/admin-nav'
import type { AdminUser } from '#shared/admin-user'

definePageMeta({ layout: false })
defineI18nRoute(false)
useHead({
  title: 'Вход — админка Peetri Toll',
  htmlAttrs: { lang: 'ru' },
  bodyAttrs: { class: 'adm-body' },
  meta: [{ name: 'viewport', content: 'width=1280' }],
})

const route = useRoute()
const { user, canAny } = useAdminUser()

const form = reactive({ email: '', password: '', remember: true })
const error = ref('')
const sending = ref(false)

async function submit() {
  error.value = ''
  sending.value = true
  try {
    user.value = await $fetch<AdminUser>('/api/auth/login', { method: 'POST', body: form })
    // Возвращаем туда, куда сотрудник шёл, — только внутрь админки
    const next = typeof route.query.next === 'string' ? route.query.next : ''
    const inAdmin = next === '/admin' || next.startsWith('/admin/')
    await navigateTo(inAdmin ? next : firstAllowedPath(canAny))
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode
    const fallback = 'Не удалось войти. Попробуйте ещё раз.'
    // Свои тексты — только на понятные случаи; на сбой сервера — общий
    error.value =
      status === 400 || status === 401 || status === 429 ? apiErrorMessage(e, fallback) : fallback
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <main class="adm-login">
    <div class="adm-login__box">
      <NuxtLink class="adm-login__brand" to="/" aria-label="Peetri Toll — на сайт">
        <img src="/images/logo.svg" alt="Peetri Toll" width="109" height="57" />
        <span>Админка</span>
      </NuxtLink>

      <div class="adm-login__card">
        <h1 class="adm-login__title">Вход для сотрудников</h1>
        <p class="adm-login__lead">Учётные записи заводит владелец в разделе «Сотрудники».</p>

        <form class="adm-login__form" @submit.prevent="submit">
          <p v-if="error" class="adm-alert" role="alert">{{ error }}</p>

          <div class="field">
            <label for="login-email">E-mail</label>
            <input
              id="login-email"
              v-model="form.email"
              type="email"
              autocomplete="username"
              placeholder="name@peetritoll.ee"
              required
            />
          </div>
          <div class="field">
            <label for="login-pass">Пароль</label>
            <input
              id="login-pass"
              v-model="form.password"
              type="password"
              autocomplete="current-password"
              required
            />
          </div>
          <div class="adm-login__row">
            <label><input v-model="form.remember" type="checkbox" /> Запомнить меня</label>
          </div>
          <button class="btn btn--solid" type="submit" :disabled="sending">
            {{ sending ? 'Входим…' : 'Войти' }}
          </button>
          <!-- Ссылку для нового пароля пришлём письмом, когда подключим почту (срез «Заявки и лиды») -->
          <p class="adm-note">Забыли пароль? Новый выдаёт владелец.</p>
        </form>
      </div>

      <p class="adm-login__foot">
        Это закрытый раздел, в поиске не показывается. <NuxtLink to="/">Вернуться на сайт</NuxtLink>
      </p>
    </div>
  </main>
</template>
