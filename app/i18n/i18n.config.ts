// Настройки vue-i18n. Если перевода строки нет — показываем эстонский текст (5.5).
export default defineI18nConfig(() => ({
  fallbackLocale: 'et',
}))
