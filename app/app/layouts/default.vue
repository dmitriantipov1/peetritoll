<!-- Макет публичного сайта: шапка, содержимое страницы, подвал -->
<template>
  <div>
    <SiteHeader />
    <main>
      <slot />
    </main>
    <SiteFooter />
  </div>
</template>
