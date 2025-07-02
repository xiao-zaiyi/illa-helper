import { defineConfig } from 'wxt';
import removeConsole from 'vite-plugin-remove-console';
import tailwindcss from '@tailwindcss/vite';
// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    name: '浸入式学语言助手(illa-helper)',
    author: {
      email: 'xiao1932794922@gmail.com',
    },
    description: `浸入式学语言助手(illa-helper) extension turns browsing into language learning. AI uses "i+1" theory, supports 20+ languages.`,
    version: '1.7.4',
    permissions: ['storage', 'notifications', 'contextMenus', 'activeTab'],
    host_permissions: ['<all_urls>'],
    browser_specific_settings: {
      gecko: {
        id: 'illa-helper@xiao1932794922.gmail.com',
        strict_min_version: '88.0',
      },
    },
    commands: {
      'translate-page': {
        suggested_key: {
          default: 'Alt+A',
          mac: 'Command+A',
        },
        description: '一键翻译',
      },
    },
  },
  imports: {
    eslintrc: {
      enabled: 9,
    },
  },
  vite: (configEnv) => ({
    plugins: [
      tailwindcss(),
      configEnv.mode === 'production'
        ? [removeConsole({ includes: ['log', 'warn'] })]
        : [],
    ],
  }),
});
