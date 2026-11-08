<script setup lang="ts">
// Макет публичного сайта: шапка, содержимое страницы, подвал.
// Язык страницы в <html lang>, ссылки на другие языки (hreflang, x-default — эстонский)
// и canonical — из настроек i18n в nuxt.config.ts.
const head = useLocaleHead()

useHead(() => ({
  htmlAttrs: { lang: head.value.htmlAttrs.lang },
  link: head.value.link,
  meta: head.value.meta,
}))
</script>

<template>
  <div>
    <SiteHeader />
    <main>
      <slot />
    </main>
    <SiteFooter />
  </div>
</template>
