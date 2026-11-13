<script setup lang="ts">
// Подвал сайта. Разметка и классы — из прототипа (index.html).
// Часы, адрес, телефон, почта и соцсети — из админки «Контакты и часы» (тот же запрос,
// что у страницы «Контакты»). Пустые ссылки соцсетей не показываем (TripAdvisor и
// Foursquare ждём от заказчицы, 8.3).
import { phoneDigits } from '#shared/site-contacts'

const { t } = useI18n()
const localePath = useLocalePath()
const year = new Date().getFullYear()

const { data: c } = await useSiteContacts()

const social = computed(() =>
  [
    { label: 'Facebook', href: c.value?.facebook },
    { label: 'TripAdvisor', href: c.value?.tripadvisor },
    { label: 'Foursquare', href: c.value?.foursquare },
  ].filter((s) => s.href),
)
</script>

<template>
  <footer id="kontakty" class="footer">
    <div class="container footer__inner">
      <img
        class="footer__logo"
        src="/images/footer.png"
        alt="Peetri Toll, 1716"
        width="980"
        height="241"
        loading="lazy"
      />

      <address v-if="c" class="footer__contacts">
        <p>{{ c.hoursLine }}</p>
        <p v-if="c.address">{{ c.address }}</p>
        <p v-if="c.phone">
          <a :href="`tel:${phoneDigits(c.phone)}`">{{ c.phone }}</a>
        </p>
        <p v-if="c.email">
          <a :href="`mailto:${c.email}`">{{ c.email }}</a>
        </p>
      </address>
    </div>

    <div class="footer__bottom">
      <div class="container footer__bottom-inner">
        <p>
          © {{ year }} Tavern Peetri Toll ·
          <NuxtLink :to="localePath('/privacy')">{{ t('footer.privacy') }}</NuxtLink> ·
          <NuxtLink :to="localePath('/cookies')">{{ t('footer.cookies') }}</NuxtLink>
        </p>
        <ul class="social">
          <li v-for="item in social" :key="item.label">
            <a :href="item.href" target="_blank" rel="noopener">{{ item.label }}</a>
          </li>
        </ul>
      </div>
    </div>
  </footer>
</template>
