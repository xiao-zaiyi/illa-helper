# 🚀 自动化发布系统

## 快速开始

### 方法一：使用发布脚本（推荐）

```bash
# 发布新版本
npm run release 1.8.0

# 发布测试版本
npm run release 1.8.0-beta.1

# 强制发布（忽略未提交变更）
npm run release 1.8.0 -- --force
```

### 方法二：手动发布

```bash
# 1. 更新版本号（在 wxt.config.ts 中）
# 2. 提交变更
git add .
git commit -m "🔖 发布版本 v1.8.0"

# 3. 创建并推送标签
git tag v1.8.0
git push origin master
git push origin v1.8.0
```

## 系统组成

- **`.github/workflows/release.yml`** - GitHub Actions 工作流
- **`scripts/release.js`** - 自动化发布脚本
- **`docs/RELEASE_GUIDE.md`** - 详细使用指南

## 发布流程

1. 📝 更新版本号
2. 🔍 代码质量检查
3. 🏗️ 构建所有平台扩展包
4. 🎁 创建 GitHub Release
5. 📤 上传构建产物

## 构建产物

- `illa-helper-{version}-chrome.zip`
- `illa-helper-{version}-firefox.zip`
- `illa-helper-{version}-safari.zip`

---

更多详细信息请查看 [发布指南](docs/RELEASE_GUIDE.md) 