// Плавное появление при прокрутке (как в прототипе, js/main.js, 14.11.2026): разделы, карточки
// и фото проявляются и чуть поднимаются, когда доходят до экрана; в сетках — по очереди.
// После каждого перехода на страницу сканируем её заново. Первый экран не трогаем — он уже виден.
// Админку не трогаем. При «уменьшить движение» и без IntersectionObserver — ничего не делаем.
const BLOCKS = [
  '.section-head',
  '.intro',
  '.story__text',
  '.story__media',
  '.two-col > *',
  '.cta-row',
  '.exhibition__text',
  '.exhibition__gallery',
  '.events',
  '.subsection',
  '.menu-cat',
  '.bk-card',
  '.bq-form',
  '.article',
].join(',')
const ITEMS = [
  '.grid-2 > li',
  '.grid-3 > li',
  '.grid-4 > li',
  '.products > li',
  '.news > li',
  '.halls > li',
  '.services > li',
  '.gallery > li',
  '.explore > li',
  '.meal-cards > li',
  '.partners--logos > li',
].join(',')

export default defineNuxtPlugin((nuxtApp) => {
  if (!('IntersectionObserver' in window)) return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        e.target.classList.add('is-in')
        io.unobserve(e.target)
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  )

  function scan() {
    if (useRoute().path.startsWith('/admin')) return
    const marked: HTMLElement[] = []
    const watch = (el: HTMLElement) => {
      if (el.dataset.reveal) return
      el.dataset.reveal = '1'
      if (el.getBoundingClientRect().top < window.innerHeight) return
      el.classList.add('reveal')
      marked.push(el)
      io.observe(el)
    }
    document.querySelectorAll<HTMLElement>(BLOCKS).forEach(watch)
    // В сетке — по очереди, по 4 в «волне»
    document.querySelectorAll<HTMLElement>(ITEMS).forEach((el) => {
      const i = Array.from(el.parentElement?.children ?? []).indexOf(el)
      el.style.setProperty('--reveal-delay', `${(i % 4) * 90}ms`)
      watch(el)
    })
    // Сначала «спрятано» без перехода, плавность — после: иначе блоки сначала плавно погаснут
    void document.body.offsetHeight
    marked.forEach((el) => el.classList.add('reveal--ready'))
  }

  // После перехода Nuxt прокручивает страницу к началу — сканируем чуть позже
  nuxtApp.hook('page:finish', () => {
    setTimeout(scan, 60)
  })
})
