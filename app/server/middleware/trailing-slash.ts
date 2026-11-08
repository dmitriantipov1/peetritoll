// Один адрес у каждой страницы: без слэша в конце. /et/menu/ → 301 на /et/menu.
// Иначе поисковик видит две страницы с одинаковым содержимым (canonical — без слэша).
export default defineEventHandler((event) => {
  const url = getRequestURL(event)
  const path = url.pathname

  if (path.length > 1 && path.endsWith('/')) {
    const target = (path.replace(/\/+$/, '') || '/') + url.search
    return sendRedirect(event, target, 301)
  }
})
