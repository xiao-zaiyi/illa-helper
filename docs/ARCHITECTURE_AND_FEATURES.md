# Architecture And Features

ILLA Helper 是一个 WXT + Vue 3 浏览器扩展，用于把网页内容转成语言学习材料。当前架构以用户可见路径为边界：API 配置、单词翻译、段落翻译、发音悬浮框和网站规则。

## Current Runtime Model

- API 配置只保存协议族，当前协议族只有 `openai-compatible` 和 `gemini`。
- OpenAI、DeepSeek、SiliconFlow 是设置页里的 OpenAI 兼容预设，不是运行时 provider。
- Gemini 自定义 endpoint 属于 Gemini 协议族内部能力，不再有独立 ProxyGemini provider。
- Anthropic 已下线，UI、存储和运行时都不保留假支持。
- OpenAI 兼容 HTTP 请求统一由 extension background 发起，避免 Mixed Content 和 CORS 分叉。
- 导入导出只接受当前 `3.0` 格式，不再内置旧格式迁移。

## Main Modules

- `entrypoints/options/components/translation/TranslationSettings.vue`: API 配置和翻译设置 UI。
- `src/modules/shared/ApiConfigHelpers.ts`: API 预设、协议族标签和配置清洗。
- `src/modules/core/storage/StorageService.ts`: 用户设置读写和当前格式验证。
- `src/modules/api/factory/ApiServiceFactory.ts`: 根据协议族创建翻译 provider。
- `src/modules/api/providers`: OpenAI 兼容和 Gemini 的适配层。
- `src/modules/content/ContentManager.ts`: content script 生命周期和服务组装。
- `src/modules/content/services/ConfigurationService.ts`: 把用户设置解析成页面运行配置。
- `src/modules/core/translation/LanguageService.ts`: 页面语言检测和翻译目标语言解析。
- `src/modules/core/translation/TextReplacerService.ts`: 单词翻译替换链路。
- `src/modules/core/translation/ParagraphTranslationService.ts`: 段落翻译链路。
- `src/modules/options/website-management`: 网站黑白名单规则管理。

## Design Notes

当前代码不再把历史兼容分支放在主路径里。旧配置、旧 provider 名称、废弃接口和示例代码不作为运行时的一部分；如果以后需要保留用户数据，应使用一次性迁移工具，而不是把兼容逻辑塞回业务链路。