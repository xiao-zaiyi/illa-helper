# Unify API Config And Isolate Provider Adapters

项目保留统一的用户级 API 配置模型，设置页、存储层和运行时配置只围绕这一个模型工作。运行时只承认 `openai-compatible` 和 `gemini` 两个协议族；OpenAI、DeepSeek、SiliconFlow 只是 OpenAI 兼容接口的 UI 预设，Anthropic 已下线，ProxyGemini 并回 Gemini。协议差异只能存在于适配层，不能继续扩散到 UI、存储修正、连接测试和业务主路径里。
