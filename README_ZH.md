# 浸入式学语言助手

<div align="center">
<img src="public/icon/128.png" width="100" height="100"  />
</div>
<div align="center">

![Version](https://img.shields.io/github/package-json/v/xiao-zaiyi/illa-helper?color=blue)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)
![Status](https://img.shields.io/badge/status-stable-green)
![Built with WXT](https://img.shields.io/badge/built%20with-WXT-blue)
![Firefox Compatible](https://img.shields.io/badge/Firefox-compatible-orange)
<br/>
<a href="https://hellogithub.com/repository/52653c92268d4024878a1a6781df9dd8" target="_blank"><img src="https://abroad.hellogithub.com/v1/widgets/recommend.svg?rid=52653c92268d4024878a1a6781df9dd8&claim_uid=RfJtwvgkBr3MUGy&theme=small" alt="Featured｜HelloGitHub" /></a>
</div>

> 一款基于"可理解输入"理论的浏览器扩展，帮助你在日常网页浏览中自然地学习语言。

简体中文 | [English](./README.md)

## ✨ 核心理念

我坚信，语言学习的最佳途径是大量接触"可理解的"输入材料，即著名的 **"i+1"** 理论。这意味着内容应该略高于你当前的水平，既有挑战性，又不至于让你完全看不懂。本扩展旨在将整个互联网变成你的个性化语言学习教材，通过智能地将网页上的部分词语替换为你正在学习的目标语言词汇，让你在沉浸式的阅读中，不知不觉地提升词汇量和语感。

**🎯 项目亮点**: 集成了完整的发音学习生态系统和智能多语言翻译功能，包括自动语言检测、音标显示、AI词义解释、双TTS语音合成和交互式悬浮框，为用户提供从智能翻译到发音学习的一站式沉浸式体验。

> 📚 **完整文档**: 查看 [架构与功能详解](./docs/ARCHITECTURE_AND_FEATURES.md) 了解技术架构、API接口、开发指南和故障排除。

## 🚀 功能特性

### 🎯 核心翻译引擎
- **智能语言检测**: AI自动识别网页源语言，无需用户手动指定语言类型
- **智能文本处理**: 使用大语言模型分析网页内容，智能选择适合用户水平的词汇进行翻译
- **精确替换控制**: 可精确控制翻译比例（1%-100%），支持字符级精确计算
- **上下文感知**: 考虑语境和用户水平，选择最合适的翻译词汇
- **多语言支持**: 支持20+种语言的智能翻译（英语、日语、韩语、法语、德语、西班牙语、俄语、意大利语、葡萄牙语、荷兰语、瑞典语、挪威语、丹麦语、芬兰语、波兰语、捷克语、土耳其语、希腊语等）**理论上依赖大模型能力**。
- **翻译位置控制**: 新增翻译文本位置自定义功能，更灵活的显示方式
- **括号显示控制**: 可选择是否显示翻译文本的括号，提供更清爽的阅读体验

### 🔊 发音学习生态系统 ⭐
- **交互式悬浮框**: 鼠标悬停翻译词汇即可查看音标、AI词义和朗读功能，智能定位避免边界溢出
- **双层学习体验**: 短语显示可交互的单词列表，点击单个单词查看详细信息，支持嵌套悬浮框
- **多TTS服务支持**: 集成有道TTS（高质量）和Web Speech API（备用），支持英式/美式发音切换
- **智能音标获取**: 自动获取Dictionary API音标数据，24小时TTL缓存优化性能
- **AI词义解释**: 实时调用AI生成中文词义解释，理解更准确，支持上下文语境分析
- **渐进式加载**: 先显示基础信息，再异步加载详细内容，优化用户体验
- **音频缓存**: 内存级TTS音频缓存，同一单词无需重复生成语音
- **快捷键支持**: 新增发音弹出框快捷键设置，提升操作效率

### 🎨 丰富的视觉体验
- **7种翻译样式**: 默认、微妙、粗体、斜体、下划线、高亮、学习模式（模糊效果）
- **学习模式**: 翻译词汇初始模糊显示，鼠标悬停时清晰化，增强记忆效果
- **辉光动画**: 新翻译词汇出现时的柔和提示效果，不干扰阅读体验
- **响应式设计**: 自适应深色/浅色主题，智能悬浮框定位
- **悬浮工具球**: 新增可配置的悬浮工具球，快速访问常用功能

### ⚙️ 高度可配置性
- **智能翻译模式**: 用户只需选择目标语言，AI自动检测源语言并进行翻译
- **用户水平适配**: 从初级到精通5个级别，AI智能调整词汇难度和选择策略
- **触发模式**: 支持自动触发（页面加载时处理）和手动触发两种工作方式
- **原文显示控制**: 可选择显示、隐藏或学习模式（模糊效果）显示被翻译的原文
- **段落长度控制**: 自定义AI单次处理的最大文本长度
- **发音功能开关**: 可独立控制发音悬浮框功能的启用状态
- **多API配置**: 支持配置多个API服务，可灵活切换不同的翻译服务提供商
- **数据导入导出**: 新增配置数据的导入导出功能，方便备份和迁移

### 🔌 开放式API集成
- **兼容OpenAI API**: 支持任何兼容 OpenAI 格式的AI服务（ChatGPT、Claude、豆包等国产大模型）
- **灵活配置**: 自定义API Key、Endpoint、模型名称、Temperature参数
- **智能提示词**: 根据翻译方向和用户水平动态生成最优提示词
- **错误处理**: 完善的API错误处理和重试机制
- **多API支持**: 支持配置多个API服务并灵活切换，提供更可靠的服务保障

### 🚀 性能与优化
- **智能缓存**: 翻译结果、音标数据、TTS音频多级缓存策略
- **增量处理**: 只处理新增内容，避免重复翻译
- **DOM安全**: 使用Range API确保DOM结构完整性
- **内存管理**: 及时清理监听器，优化内存使用

### 💻 现代技术架构
- **框架**: [WXT](https://wxt.dev/) - 现代WebExtension开发框架
- **前端**: Vue 3 + TypeScript + Vite
- **UI库**: Tailwind CSS + Lucide Icons
- **构建**: ESLint + Prettier + TypeScript编译
- **API集成**: OpenAI兼容接口 + Dictionary API + 有道TTS
- **跨浏览器兼容**: 支持Chrome、Edge、Firefox，部分支持Safari

## 🌐 浏览器兼容性

本扩展基于 [Web Extension API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions) 和 [WXT](https://wxt.dev/) 构建，支持以下浏览器：

| 浏览器 | 支持状态 | 特殊说明 |
|-------|--------|----------|
| Chrome | ✅ 完全支持 | 推荐环境，所有功能可用 |
| Edge | ✅ 完全支持 | 基于Chromium，完整兼容 |
| Firefox | ✅ 支持 | 需配置addon ID，详见[Firefox安装指南](#firefox-安装指南) |
| Safari | ⚠️ 部分支持 | 需要额外配置，自行查询 |

## ⚡ 性能特性

### 🚀 智能缓存系统
- **翻译结果**: 基于内容和设置的智能缓存，避免重复API调用
- **音标数据**: 24小时TTL本地缓存，提升响应速度
- **TTS音频**: 内存级缓存，同一单词无需重复生成语音

### 🔄 增量处理机制
- **DOM监听**: 只处理新增内容，避免重复翻译
- **防抖优化**: 动态内容变化时的智能延迟处理
- **Range API**: 精确DOM操作，保持页面结构完整性

## 📸 功能展示

### 🎬 动态演示
<div align="center">
  <img src="images/Demo.gif" alt="浸入式语言学习助手完整演示" style="max-width:80%; border-radius:8px; box-shadow:0 4px 8px rgba(0,0,0,0.1)"/>
  <img src="images/demo1.gif" alt="浸入式语言学习助手完整演示" style="max-width:80%; border-radius:8px; box-shadow:0 4px 8px rgba(0,0,0,0.1)"/>
  <p><i>🎯 完整演示: 从智能翻译到发音学习的一站式沉浸式体验</i></p>
</div>

### 🎨 主题适配展示
<div style="width:100%" align="center">
  <img src="images/home-dark.png" alt="深色主题翻译效果" style="width:30%; margin:5px; border-radius:6px"/>
  <img src="images/home-dark1.png" alt="深色主题变体" style="width:30%; margin:5px; border-radius:6px"/>
  <img src="images/home-light.png" alt="浅色主题翻译效果" style="width:30%; margin:5px; border-radius:6px"/>
  <p><i>🌗 主题适配: 深色/浅色主题智能切换，现代化视觉体验</i></p>
  <img src="images/set-base.png" alt="设置" style="width:100%; margin:5px; border-radius:6px;"/>
  <img src="images/set-ai.png" alt="设置" style="width:100%; margin:5px; border-radius:6px;"/>
  <p><i>👍 设置页支持多种配置</i></p>
</div>


### 🌍 多语言学习场景
<div style="width:100%" align="center">
  <img src="images/cn-test.png" alt="中文学习场景" style="width:45%; margin:5px; border-radius:6px"/>
  <img src="images/en-test.png" alt="英文学习场景" style="width:45%; margin:5px; border-radius:6px"/>
  <br/>
  <img src="images/jp-test.png" alt="日文学习场景" style="width:45%; margin:5px; border-radius:6px"/>
  <img src="images/k-test.png" alt="韩文学习场景" style="width:45%; margin:5px; border-radius:6px"/>
  <p><i>🧠 智能多语言: 支持20+种语言的AI自动检测和翻译，涵盖中文、英语、日语、韩语等主流学习语言</i></p>
</div>

## 🛠️ 安装与运行

### 1. 先决条件

- [Node.js](https://nodejs.org/)（版本 18 或更高）
- [npm](https://nodejs.org/) 或其他包管理器

### 2. 安装

1.  **克隆仓库:**
    
    ```bash
    git clone https://github.com/xiao-zaiyi/illa-helper.git
    cd illa-helper
    ```
    
2.  **安装依赖:**
    
    ```bash
    npm install
    ```
    
> **提示**: 如果你只想使用这个扩展而不参与开发，请直接前往 [Releases](https://github.com/xiao-zaiyi/illa-helper/releases) 页面下载最新版本的打包文件。

### 3. 配置

项目通过 `.env` 文件管理本地开发环境的配置。

1.  **创建 `.env` 文件:**
    复制 `.env.example` 文件来创建你自己的本地配置文件。
    ```bash
    cp .env.example .env
    ```

2.  **修改配置:**
    打开新建的 `.env` 文件，至少你需要提供一个有效的 API Key 才能让翻译功能正常工作。
    ```env
    VITE_WXT_DEFAULT_API_KEY="sk-your-real-api-key"
    # 你也可以在这里覆盖其他的默认设置
    VITE_WXT_DEFAULT_API_ENDPOINT="https://xxxxx/api/v1/chat/completions"
    VITE_WXT_DEFAULT_MODEL="gpt-4"
    VITE_WXT_DEFAULT_TEMPERATURE="0.2"
    ```
    > **注意**: `.env` 文件已被添加到 `.gitignore` 中，所以你的密钥不会被意外提交。

### 4. 构建扩展

根据目标浏览器执行相应的构建命令：

#### Chrome/Edge构建
```bash
npm run build
npm run zip
```

#### Firefox构建
```bash
npm run build:firefox
npm run zip:firefox
```

### 5. 加载扩展

#### Chrome/Edge安装
1. 打开浏览器（Chrome、Edge等）
2. 进入扩展管理页面（`chrome://extensions` 或 `edge://extensions`）
3. 打开 **"开发者模式"**
4. 点击 **"加载已解压的扩展程序"**
5. 选择项目根目录下的 `.output/chrome-mv3` 文件夹
6. 完成！现在你应该能在浏览器工具栏看到扩展的图标了

#### Firefox安装指南 <a id="firefox-安装指南"></a>

Firefox由于安全限制，需要特殊的安装步骤：

**方法一：临时安装（推荐开发调试）**
1. 在Firefox地址栏输入 `about:debugging#/runtime/this-firefox`
2. 点击 **"临时加载附加组件..."**
3. 选择 `.output/firefox-mv2/manifest.json` 文件
4. 扩展将以临时方式加载，浏览器重启后需要重新加载

**方法二：修改安全配置（永久安装）**
1. 在Firefox地址栏输入 `about:config`
2. 搜索 `xpinstall.signatures.required`
3. 双击将值改为 `false`
4. 现在可以通过 `about:addons` 安装未签名的扩展

**Firefox Storage API配置说明**

Firefox中的storage API需要明确的addon ID才能正常工作。本项目已在 `wxt.config.ts` 中配置了Firefox特定设置：

```typescript
browser_specific_settings: {
  gecko: {
    id: 'illa-helper@xiao-zaiyi',
    strict_min_version: '88.0'
  }
}
```

这确保了在Firefox中可以正常使用存储功能保存用户设置。

## 📂 目录结构

```
.
├── .output/              # WXT 打包输出目录
│   ├── chrome-mv3/       # Chrome/Edge扩展文件
│   └── firefox-mv2/      # Firefox扩展文件
├── assets/               # 静态资源目录 (例如 CSS, 字体)
├── components/           # 全局Vue组件
├── docs/                 # 📚 项目文档
│   └── ARCHITECTURE_AND_FEATURES.md  # 详细技术文档
├── entrypoints/          # 扩展入口点
│   ├── background.ts     # 后台服务 (配置验证、通知管理)
│   ├── content.ts        # 内容脚本 (核心翻译逻辑)
│   ├── popup/            # Vue 3 弹窗界面
│   │   ├── App.vue       # 主界面组件
│   │   ├── index.html    # 弹窗页面
│   │   ├── main.ts       # 入口点脚本
│   │   └── style.css     # 弹窗样式
│   └── options/          # 设置页面（Vue 3）
│       ├── App.vue       # 设置主界面
│       ├── index.html    # 设置页面HTML
│       ├── main.ts       # 设置页面入口脚本
│       └── components/   # 设置页面组件 (内容无法获取)
├── images/               # 项目图片资源
├── lib/                  # 第三方库或辅助模块
├── src/modules/          # 核心功能模块 (注意：由于环境限制，此目录下的详细结构未能完全验证)
│   ├── pronunciation/    # 🔊 发音系统模块（完整生态系统）
│   │   ├── phonetic/     # 音标获取服务（Dictionary API）
│   │   ├── tts/          # 语音合成服务（有道TTS + Web Speech）
│   │   ├── translation/  # AI翻译集成（词义解释）
│   │   ├── services/     # 发音服务协调器（核心逻辑）
│   │   ├── ui/           # 悬浮框UI组件（交互界面）
│   │   ├── utils/        # 工具函数库（DOM、定位、计时器）
│   │   ├── config/       # 配置管理（常量、配置项）
│   │   └── types/        # 类型定义（完整类型系统）
│   ├── options/          # 设置管理模块
│   │   └── blacklist/    # 网站黑名单功能
│   ├── processing/       # 文本处理模块
│   ├── floatingBall/     # 浮动球功能
│   ├── api/              # AI翻译API服务模块
│   ├── textProcessor.ts  # 智能文本处理器
│   ├── textReplacer.ts   # 文本替换引擎
│   ├── styleManager.ts   # 样式管理器
│   ├── storageManager.ts # 配置存储管理
│   ├── languageManager.ts# 多语言支持
│   ├── promptManager.ts  # AI提示词管理
│   ├── messaging.ts      # 消息传递系统
│   └── types.ts          # 核心类型定义
├── public/               # 静态资源
│   ├── icon/             # 扩展图标 (内容无法获取)
│   ├── warning.png       # 通知图标
│   └── wxt.svg           # WXT 图标
├── .env.example          # 环境变量模板
├── wxt.config.ts         # WXT 框架配置
└── package.json          # 项目依赖配置
```

### 🔧 核心技术栈

- **框架**: [WXT](https://wxt.dev/) - 现代WebExtension开发框架
- **前端**: Vue 3 + TypeScript + Vite
- **UI库**: Tailwind CSS + Lucide Icons
- **构建**: ESLint + Prettier + TypeScript编译
- **API集成**: OpenAI兼容接口 + Dictionary API + 有道TTS
- **架构模式**: Provider模式 + 模块化设计 + 事件驱动
- **发音系统**: 工厂模式 + 多TTS服务 + 智能缓存
- **存储管理**: 配置版本控制 + 跨浏览器兼容

> 📖 **查看详细文档**: [架构与功能详解](./docs/ARCHITECTURE_AND_FEATURES.md) - 包含完整的技术架构、API参考和开发指南

## ❓ 常见问题

### 为什么我需要提供API密钥？

本扩展使用AI技术进行智能文本翻译，这需要调用API服务。您可以使用 OpenAI 的API密钥，或任何兼容 OpenAI API格式的第三方服务。

### 发音功能如何工作？

发音系统是我们的核心特色功能，提供完整的学习体验：
- **音标显示**: 自动获取Dictionary API音标数据
- **AI词义**: 实时调用AI获取中文释义解释
- **双TTS支持**: 有道TTS（高质量）+ Web Speech API（备用）
- **交互悬浮框**: 鼠标悬停查看，支持英美发音切换
- **短语学习**: 短语中每个单词都可独立查看和朗读

### 智能翻译模式如何使用？

智能翻译是我们的新功能，使用简单：
1. **选择翻译模式**: 在设置中选择"🧠 智能多语言模式"
2. **选择目标语言**: 从20+种支持语言中选择你想学习的语言
3. **开始浏览**: AI会自动检测网页语言并翻译到你的目标语言
4. **无需额外配置**: 系统会自动处理不同语言的网页内容

### 扩展会收集我的浏览数据吗？

不会。本扩展在本地处理所有网页内容，只将需要翻译的文本片段发送到配置的API服务。发音功能的音标和词义数据也会本地缓存，保护您的隐私。

### 我可以控制翻译比例吗？

可以。扩展提供了精确的翻译控制：
- **语言水平**: 5个级别从初级到精通，AI智能调整词汇难度
- **替换比例**: 1%-100%精确控制，支持按字符数计算
- **原文显示**: 可选择显示、隐藏或学习模式（模糊效果）
- **智能适配**: 在智能模式下，系统会根据检测到的语言自动优化翻译策略

### Safari浏览器如何安装？<a id="safari-扩展安装"></a>

Safari需要额外的步骤将Web扩展打包为Safari扩展。请参考[Apple开发者文档](https://developer.apple.com/documentation/safariservices/safari_web_extensions/converting_a_web_extension_for_safari)。

### Firefox相关问题解决 🚨

#### "获取用户设置失败: Error: The storage API will not work with a temporary addon ID"

这是Firefox的已知限制。解决方案：

1. **使用最新版本**: 确保使用最新的构建版本，已包含Firefox特定配置
2. **使用Firefox专用构建**: 运行 `npm run build:firefox && npm run zip:firefox`
3. **临时安装**: 通过 `about:debugging` 页面安装，而不是直接安装.xpi文件

#### "扩展此组件无法安装，因为它未通过验证"

- **方法一**：通过在地址栏输入 `about:debugging#/runtime/this-firefox` 选择 `临时加载附加组件...` 可以从文件安装Firefox扩展
- **方法二**：地址栏输入 `about:config` 搜索 `xpinstall.signatures.required` 设置项，双击改为 `false`

<div align="center">
  <img src="images/firefox-cn.png" style="max-width:80%; border-radius:8px; box-shadow:0 4px 8px rgba(0,0,0,0.1)"/>
</div>

### API相关问题

#### "API配置错误"通知

检查以下配置：
- API Key格式是否正确（通常以`sk-`开头）
- API Endpoint URL是否有效
- 模型名称是否支持
- 网络连接是否正常

#### 翻译质量不理想

可以尝试：
- 调整用户水平设置
- 修改翻译比例
- 更换更强大的AI模型
- 调整Temperature参数（建议0.1-0.3）

## 🛠️ 故障排除

### 常见问题诊断

#### 1. 扩展加载失败
- 检查Node.js版本（需要18+）
- 确保依赖安装完整：`npm install`
- 查看构建日志是否有错误

#### 2. 翻译功能不工作
- 验证API配置是否正确
- 检查网络连接
- 查看开发者控制台错误信息

#### 3. 发音功能异常
- 确保浏览器支持Web Speech API
- 检查有道TTS服务状态
- 验证Dictionary API可访问性

#### 4. 设置无法保存
- Firefox用户确认使用正确的安装方式
- 检查扩展权限设置
- 清除浏览器缓存后重试


## 🤝 贡献指南

我们非常欢迎各种形式的贡献！无论是提交 Bug、提出新功能建议，还是直接贡献代码。

### 如何贡献

1. **提交问题**
   - 使用 GitHub Issues 报告 bug 或提出功能建议
   - 清晰描述问题或建议的详细内容
   - 如果是 bug，请提供复现步骤和环境信息

2. **贡献代码**
   - **Fork** 本仓库
   - 创建一个新的分支 (`git checkout -b feature/your-amazing-feature`)
   - 编写并测试您的代码
   - 确保代码遵循项目的编码规范
   - 提交您的代码更改 (`git commit -m 'Add some amazing feature'`)
   - 将您的分支推送到远程仓库 (`git push origin feature/your-amazing-feature`)
   - 创建一个 **Pull Request**

3. **改进文档**
   - 文档改进对项目同样重要
   - 可以修正错别字、完善解释或添加示例

### 开发指南

- **架构原则**: 遵循Provider模式和模块化设计，特别是发音系统的工厂模式
- **代码规范**: TypeScript严格模式，ESLint + Prettier格式化，完整类型定义
- **测试要求**: 确保新功能在多种浏览器和网站上正常工作，特别是多语言环境
- **性能考虑**: 注意DOM操作效率、内存管理和多语言缓存策略
- **API兼容**: 保持与现有API接口的向后兼容性，支持配置版本迁移
- **多语言支持**: 新增语言时需要在languageManager.ts注册并测试翻译效果
- **发音功能**: 扩展TTS服务时需要实现ITTSProvider接口并注册到工厂
- **浏览器兼容性**: 新功能需要在Chrome、Edge、Firefox中测试

> 📖 **详细开发指南**: 查看 [架构与功能详解](./docs/ARCHITECTURE_AND_FEATURES.md) 获取完整的开发环境配置、代码结构说明和最佳实践。

## 🔗 相关链接

- **项目主页**: [GitHub Repository](https://github.com/xiao-zaiyi/illa-helper)
- **问题反馈**: [GitHub Issues](https://github.com/xiao-zaiyi/illa-helper/issues)
- **版本发布**: [GitHub Releases](https://github.com/xiao-zaiyi/illa-helper/releases)
- **技术文档**: [架构与功能详解](./docs/ARCHITECTURE_AND_FEATURES.md)
- **WXT框架**: [WXT.dev](https://wxt.dev/)

## 📧 联系我们

- **作者**: Xiao-zaiyi
- **GitHub**: [@xiao-zaiyi](https://github.com/xiao-zaiyi)
- **项目讨论**: 通过GitHub Issues进行技术讨论

## 📜 版权许可

本项目基于 [MIT License](./LICENSE) 开源。您可以自由使用、修改和分发此代码，包括用于商业目的。

---

## 🌟 Star History [![Star History Chart](https://api.star-history.com/svg?repos=xiao-zaiyi/illa-helper&type=Date)](https://star-history.com/#xiao-zaiyi/illa-helper&Date)


<div align="center">
  <p>⭐ 如果这个项目对您有帮助，请给我们一个Star！</p>
  <p>🔄 欢迎Fork并贡献您的改进！</p>
</div>


