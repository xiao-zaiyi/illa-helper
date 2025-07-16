# 🚀 自动化发布指南

## 📋 概述

本项目已配置了自动化构建和发布流程，当推送版本标签时会自动：
- 构建所有平台的扩展包（Chrome、Firefox、Safari）
- 创建 GitHub Release
- 上传构建产物到 Release
- 生成发布说明

## 🎯 使用方法

### 1. 更新版本号

首先在 `wxt.config.ts` 中更新版本号：

```typescript
export default defineConfig({
  manifest: {
    version: '1.8.0', // 更新这里的版本号
    // ... 其他配置
  },
});
```

### 2. 提交变更

```bash
git add .
git commit -m "🔖 发布版本 v1.8.0"
git push origin master
```

### 3. 创建并推送标签

```bash
# 创建版本标签（必须以 v 开头）
git tag v1.8.0

# 推送标签到远程仓库
git push origin v1.8.0
```

### 4. 自动化流程启动

推送标签后，GitHub Actions 会自动：

1. **版本验证** - 检查标签版本与配置文件版本是否一致
2. **代码检查** - 执行 TypeScript 检查和代码格式检查
3. **构建扩展** - 构建 Chrome、Firefox、Safari 三个版本的扩展包
4. **验证构建** - 确认所有构建产物存在且有效
5. **创建 Release** - 在 GitHub 上创建新的 Release
6. **上传文件** - 将扩展包上传到 Release

## 📁 构建产物

构建完成后会生成以下文件：
- `illa-helper-{version}-chrome.zip` - Chrome 扩展包
- `illa-helper-{version}-firefox.zip` - Firefox 扩展包  
- `illa-helper-{version}-safari.zip` - Safari 扩展包

## ⚠️ 注意事项

### 版本号规范
- 必须遵循语义化版本规范：`主版本.次版本.修订版本`
- 标签必须以 `v` 开头，如：`v1.8.0`
- 标签版本必须与 `wxt.config.ts` 中的版本号完全一致

### 常见错误处理

**1. 版本不一致错误**
```
❌ 错误: 标签版本 (1.8.0) 与配置文件版本 (1.7.9) 不一致
```
解决：确保 `wxt.config.ts` 中的版本号与标签版本一致

**2. 构建失败**
- 检查代码是否通过 TypeScript 编译
- 检查是否有 lint 错误
- 确保依赖已正确安装

**3. 标签已存在**
```bash
# 删除本地标签
git tag -d v1.8.0

# 删除远程标签
git push origin :refs/tags/v1.8.0

# 重新创建标签
git tag v1.8.0
git push origin v1.8.0
```

## 🔧 高级用法

### 预发布版本

创建预发布版本（如 beta、rc）：

```bash
# 更新版本号为 1.8.0-beta.1
git tag v1.8.0-beta.1
git push origin v1.8.0-beta.1
```

### 手动触发构建

如果需要重新构建已有标签：

```bash
# 删除并重新创建标签
git tag -d v1.8.0
git push origin :refs/tags/v1.8.0
git tag v1.8.0
git push origin v1.8.0
```

## 📊 发布状态检查

### 查看构建状态
1. 访问项目的 GitHub Actions 页面
2. 查找 "Release Build and Publish" 工作流
3. 点击查看详细的构建日志

### 验证发布结果
1. 访问项目的 Releases 页面
2. 确认新版本已创建
3. 检查是否包含所有三个扩展包文件

## 🆘 故障排除

### 构建失败排查步骤

1. **检查本地构建**
   ```bash
   npm ci
   npm run compile
   npm run lint
   npm run zip:all
   ```

2. **检查版本一致性**
   ```bash
   # 检查配置文件中的版本
   grep "version:" wxt.config.ts
   
   # 检查标签
   git tag --list | tail -5
   ```

3. **查看详细错误日志**
   - 在 GitHub Actions 页面查看失败的步骤
   - 检查错误信息并修复对应问题

### 联系支持

如果遇到无法解决的问题：
1. 查看 GitHub Actions 的完整日志
2. 检查 GitHub 项目的 Issues 页面
3. 创建新的 Issue 并提供详细的错误信息

---

## 📝 版本发布清单

使用此清单确保每次发布都正确执行：

- [ ] 更新 `wxt.config.ts` 中的版本号
- [ ] 提交所有变更到 master 分支
- [ ] 创建对应的版本标签（格式：v主.次.修订）
- [ ] 推送标签到远程仓库
- [ ] 确认 GitHub Actions 构建成功
- [ ] 验证 Release 页面包含所有扩展包
- [ ] 测试下载的扩展包是否正常工作

🎉 **恭喜！您已经掌握了自动化发布流程！** 