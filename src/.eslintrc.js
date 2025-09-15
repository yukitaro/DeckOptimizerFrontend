module.exports = {
  root: true,
  env: { node: true, browser: true },
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 2020,
    sourceType: 'module',
    extraFileExtensions: ['.vue']
  },
  extends: [
    'plugin:vue/vue3-recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier'
  ],
  plugins: ['vue', '@typescript-eslint'],
  rules: {
    // example tweaks
    '@typescript-eslint/no-explicit-any': 'warn',
    'vue/html-indent': ['error', 2],
    'vue/script-setup-uses-vars': 'error'
  }
}
