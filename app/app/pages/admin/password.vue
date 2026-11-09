<script setup lang="ts">
// «Задать пароль» по ссылке из раздела «Сотрудники»: приглашение или новый пароль (5.2).
// Открывается без входа. Оформление — как у страницы входа (admin/login.html прототипа).
import { firstAllowedPath } from '~/utils/admin-nav'
import { MIN_PASSWORD_LENGTH } from '#shared/password'
import type { AdminUser } from '#shared/admin-user'
import type { PasswordLinkInfo } from '#shared/staff'

definePageMeta({ layout: false })
defineI18nRoute(false)
useHead({
  title: 'Пароль — админка Peetri Toll',
  htmlAttrs: { lang: 'ru' },
  bodyAttrs: { class: 'adm-body' },
  // Ключ ссылки не должен уходить на чужие сайты в Referer
  meta: [
    { name: 'viewport', content: 'width=1280' },
    { name: 'referrer', content: 'no-referrer' },
    { name: 'robots', content: 'noindex' },
  ],
})

const route = useRoute()
const token = computed(() => (typeof route.query.token === 'string' ? route.query.token : ''))
const { user, canAny } = useAdminUser()

const { data: info, error: linkError } = await useFetch<PasswordLinkInfo>(
  '/api/auth/password-link',
  { query: { token }, immediate: !!token.value },
)

const form = reactive({ password: '', repeat: '' })
const error = ref('')
const sending = ref(false)

async function submit() {
  error.value = ''
  if (form.password.length < MIN_PASSWORD_LENGTH) {
    error.value = `Пароль не короче ${MIN_PASSWORD_LENGTH} символов`
    return
  }
  if (form.password !== form.repeat) {
    error.value = 'Пароли не совпадают'
    return
  }
  sending.value = true
  try {
    user.value = await $fetch<AdminUser>('/api/auth/password', {
      method: 'POST',
      body: { token: token.value, password: form.password },
    })
    await navigateTo(firstAllowedPath(canAny), { replace: true })
  } catch (e) {
    error.value = apiErrorMessage(e, 'Не удалось сохранить пароль. Попробуйте ещё раз.')
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
        <template v-if="info">
          <h1 class="adm-login__title">
            {{ info.kind === 'invite' ? 'Добро пожаловать' : 'Новый пароль' }}
          </h1>
          <p class="adm-login__lead">
            {{ info.name }},
            {{ info.kind === 'invite' ? 'придумайте пароль' : 'задайте новый пароль' }} для входа в
            админку. Почта для входа — <b>{{ info.email }}</b
            >.
          </p>

          <form class="adm-login__form" @submit.prevent="submit">
            <p v-if="error" class="adm-alert" role="alert">{{ error }}</p>
            <!-- Почта в скрытом поле — чтобы менеджер паролей сохранил пару «почта + пароль» -->
            <input type="email" :value="info.email" autocomplete="username" hidden readonly />
            <div class="field">
              <label for="pw-new">Пароль</label>
              <input
                id="pw-new"
                v-model="form.password"
                type="password"
                autocomplete="new-password"
                :minlength="MIN_PASSWORD_LENGTH"
                required
              />
              <span class="adm-note">Не короче {{ MIN_PASSWORD_LENGTH }} символов</span>
            </div>
            <div class="field">
              <label for="pw-repeat">Ещё раз</label>
              <input
                id="pw-repeat"
                v-model="form.repeat"
                type="password"
                autocomplete="new-password"
                required
              />
            </div>
            <button class="btn btn--solid" type="submit" :disabled="sending">
              {{ sending ? 'Сохраняем…' : 'Сохранить и войти' }}
            </button>
          </form>
        </template>

        <template v-else>
          <h1 class="adm-login__title">Ссылка не действует</h1>
          <p class="adm-alert" role="alert">
            {{
              token
                ? apiErrorMessage(linkError, 'Не удалось проверить ссылку. Попробуйте ещё раз.')
                : 'В ссылке нет ключа. Проверьте, что скопировали её целиком.'
            }}
          </p>
          <p class="adm-note">
            Новую ссылку выдаёт владелец в разделе «Сотрудники». Уже есть пароль —
            <NuxtLink to="/admin/login">войдите</NuxtLink>.
          </p>
        </template>
      </div>

      <p class="adm-login__foot">
        Это закрытый раздел, в поиске не показывается. <NuxtLink to="/">Вернуться на сайт</NuxtLink>
      </p>
    </div>
  </main>
</template>
