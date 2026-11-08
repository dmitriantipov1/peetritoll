// Текст из редактора (TipTap) — HTML. Перед сохранением чистим по белому списку:
// только то, что умеет панель редактора, без стилей, скриптов и чужих картинок.
// Сайт выводит сохранённое как есть, поэтому чистка — здесь, а не при показе.
import sanitize from 'sanitize-html'

const options: sanitize.IOptions = {
  allowedTags: [
    'p',
    'br',
    'h2',
    'h3',
    'strong',
    'em',
    'u',
    's',
    'ul',
    'ol',
    'li',
    'blockquote',
    'a',
    'img',
    'hr',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt'],
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesAppliedToAttributes: ['href'],
  allowProtocolRelative: false,
  // Картинки в тексте — только загруженные к нам
  exclusiveFilter: (frame) =>
    frame.tag === 'img' && !/^\/uploads\/[\w/-]+\.webp$/.test(frame.attribs.src ?? ''),
  transformTags: {
    // Ссылка в новой вкладке не получает доступа к нашей странице
    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        href: attribs.href ?? '',
        ...(attribs.target === '_blank' ? { target: '_blank', rel: 'noopener noreferrer' } : {}),
      },
    }),
  },
}

export function cleanRichText(html: string): string {
  // Пустые абзацы в конце — след от Enter, на сайте это лишний отступ.
  // Пустой редактор отдаёт «<p></p>» — тогда текста нет совсем
  return sanitize(html, options)
    .trim()
    .replace(/(<p>\s*<\/p>\s*)+$/, '')
    .trim()
}
