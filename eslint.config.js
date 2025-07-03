import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import { defineConfig } from 'eslint/config';
import prettierPlugin from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default defineConfig([
  {
    ignores: ['**/.wxt/**', '**/.output/**'], // 忽略所有 .wxt 文件
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,vue}'],
    plugins: { js },
    extends: ['js/recommended'],
  },
  {
    files: ['**/*.{js,mjs,cjs,ts,mts,cts,vue}'],
    languageOptions: { globals: globals.browser },
  },
  tseslint.configs.recommended,
  pluginVue.configs['flat/essential'],
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
  {
    rules: {
      // 以下是常见支持 --fix 的规则
      semi: ['error', 'always'], // 要求分号
      quotes: ['error', 'single'], // 要求单引号
      indent: ['error', 2], // 2 空格缩进
      'comma-dangle': ['error', 'always-multiline'], // 要求多行对象/数组末尾加逗号
      'no-trailing-spaces': 'error', // 删除行尾空格
      'eol-last': ['error', 'always'], // 要求文件末尾空行
      'no-multiple-empty-lines': ['error', { max: 1 }], // 限制连续空行
      'object-curly-spacing': ['error', 'always'], // 对象花括号内空格
      'array-bracket-spacing': ['error', 'never'], // 数组括号内无空格
      'no-unused-vars': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      'no-empty': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'none',
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      'no-undef': 'off',
      'vue/multi-word-component-names': 'off',
      'no-case-declarations': 'off',
      'no-useless-escape': 'off',
    },
  },
  {
    plugins: { prettier: prettierPlugin },
    extends: [prettierConfig],
    rules: {
      'prettier/prettier': 'error',
    },
  },
]);
