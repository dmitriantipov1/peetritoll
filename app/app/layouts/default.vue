<script setup lang="ts">
// Макет публичного сайта: шапка, содержимое страницы, подвал.
// Язык страницы в <html lang>, ссылки на другие языки (hreflang) и canonical —
// из настроек i18n в nuxt.config.ts.
const head = useLocaleHead()
const route = useRoute()
const routeBaseName = useRouteBaseName()
const baseUrl = useRuntimeConfig().public.i18n.baseUrl

// x-default — версия для тех, чей язык не нашёлся. У внутренних страниц это эстонская,
// а у главной — сам корень «/»: он перенаправляет по языку, и так советует Google
// для главных с выбором языка. Входящие ссылки на корень остаются привязаны к нему.
const links = computed(() => {
  const isHome = routeBaseName(route) === 'index'
  return (head.value.link ?? []).map((link) =>
    isHome && 'hreflang' in link && link.hreflang === 'x-default'
      ? { ...link, href: `${baseUrl}/` }
      : link,
  )
})

useHead(() => ({
  htmlAttrs: { lang: head.value.htmlAttrs.lang },
  link: links.value,
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
