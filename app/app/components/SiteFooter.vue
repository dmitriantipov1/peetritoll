<script setup lang="ts">
// Подвал сайта. Разметка и классы — из прототипа (index.html).
// Часы, адрес и телефон пока вписаны здесь; из базы они придут со срезом
// «Контакты, часы работы, настройки сайта» (6.1, шаг 1.2).
const { t } = useI18n()
const localePath = useLocalePath()
const year = new Date().getFullYear()

// Адресов TripAdvisor и Foursquare пока нет, ждём от заказчицы (8.3)
const social = [
  { label: 'Facebook', href: 'https://www.facebook.com/TavernPeetriToll' },
  { label: 'TripAdvisor', href: '#' },
  { label: 'Foursquare', href: '#' },
]
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

      <address class="footer__contacts">
        <p>{{ t('footer.hours') }}</p>
        <p>{{ t('footer.address') }}</p>
        <p><a href="tel:+37253423425">+372 53 423 425</a></p>
        <p><a href="mailto:info@peetritoll.ee">info@peetritoll.ee</a></p>
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
