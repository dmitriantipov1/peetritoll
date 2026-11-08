// @ts-check
// ESLint — правила качества кода: базовые рекомендованные для JS, TypeScript и Vue
// из @nuxt/eslint. Оформление (отступы, кавычки, переносы) — дело Prettier,
// поэтому eslint-config-prettier выключает правила ESLint, которые с ним спорят.
import withNuxt from './.nuxt/eslint.config.mjs'
import prettier from 'eslint-config-prettier/flat'

export default withNuxt(prettier)
