#!/usr/bin/env node

/**
 * 自动化发布脚本
 * 简化版本发布流程：更新版本号 -> 提交 -> 创建标签 -> 推送
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ReleaseManager {
  constructor() {
    this.configPath = path.join(process.cwd(), 'wxt.config.ts');
    this.packagePath = path.join(process.cwd(), 'package.json');
  }

  /**
   * 执行系统命令
   */
  exec(command, showOutput = true) {
    try {
      const result = execSync(command, {
        encoding: 'utf8',
        stdio: showOutput ? 'inherit' : 'pipe',
      });
      return result;
    } catch (error) {
      console.error(`❌ 命令执行失败: ${command}`);
      console.error(error.message);
      process.exit(1);
    }
  }

  /**
   * 获取当前版本号
   */
  getCurrentVersion() {
    if (!fs.existsSync(this.packagePath)) {
      console.error('❌ 找不到 package.json 文件');
      process.exit(1);
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(this.packagePath, 'utf8'));
      return packageJson.version;
    } catch (error) {
      console.error('❌ 无法从 package.json 中读取版本号:', error.message);
      process.exit(1);
    }
  }



  /**
   * 验证版本号格式
   */
  validateVersion(version) {
    const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9]+(\.\d+)?)?$/;
    if (!semverRegex.test(version)) {
      console.error(
        '❌ 版本号格式无效，请使用语义化版本规范 (例如: 1.8.0, 1.8.0-beta.1)',
      );
      process.exit(1);
    }
  }

  /**
   * 检查工作目录状态
   */
  checkWorkingDirectory() {
    try {
      const status = this.exec('git status --porcelain', false);
      return status.trim() === '';
    } catch {
      return false;
    }
  }

  /**
   * 检查是否在 git 仓库中
   */
  checkGitRepository() {
    try {
      this.exec('git rev-parse --git-dir', false);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 检查标签是否已存在
   */
  checkTagExists(tag) {
    try {
      // 使用静默模式检查标签，不显示错误信息
      execSync(`git rev-parse ${tag}`, { 
        encoding: 'utf8',
        stdio: 'pipe'
      });
      return true;
    } catch {
      // 标签不存在是正常情况，返回 false
      return false;
    }
  }

  /**
   * 提交变更（如果有的话）
   */
  commitChanges(version) {
    // 检查是否有变更需要提交
    if (this.checkWorkingDirectory()) {
      console.log('ℹ️ 工作目录干净，无需提交变更');
      return;
    }

    console.log('📤 提交版本变更...');
    this.exec(`git add .`);
    this.exec(`git commit -m "🔖 发布版本 v${version}"`);
    console.log('✅ 变更提交成功');
  }

  /**
   * 创建并推送标签
   */
  createAndPushTag(version) {
    const tag = `v${version}`;

    if (this.checkTagExists(tag)) {
      console.error(`❌ 标签 ${tag} 已存在`);
      console.log('💡 如需重新发布，请先删除标签:');
      console.log(`   git tag -d ${tag}`);
      console.log(`   git push origin :refs/tags/${tag}`);
      process.exit(1);
    }

    console.log(`🏷️ 创建标签: ${tag}`);
    this.exec(`git tag ${tag}`);

    console.log('📤 推送到远程仓库...');
    this.exec('git push origin master');
    this.exec(`git push origin ${tag}`);

    console.log('✅ 标签推送成功');
  }

  /**
   * 显示发布信息
   */
  showReleaseInfo(version) {
    console.log('\n🎉 发布流程启动完成！\n');
    console.log('📊 发布信息:');
    console.log(`   版本: v${version}`);
    console.log(`   标签: v${version}`);
    console.log('\n📋 接下来会自动执行:');
    console.log('   ✅ GitHub Actions 开始构建');
    console.log('   ✅ 构建所有平台的扩展包');
    console.log('   ✅ 创建 GitHub Release');
    console.log('   ✅ 上传构建产物');

    console.log('\n🔗 查看进度:');
    console.log(
      '   GitHub Actions: https://github.com/xiao-zaiyi/illa-helper/actions',
    );
    console.log(
      '   Releases: https://github.com/xiao-zaiyi/illa-helper/releases',
    );
  }

  /**
   * 主发布流程
   */
  async release(options = {}) {
    console.log('🚀 开始自动化发布流程\n');

    // 预检查
    if (!this.checkGitRepository()) {
      console.error('❌ 当前目录不是 Git 仓库');
      process.exit(1);
    }

    // 读取当前版本号
    const currentVersion = this.getCurrentVersion();
    console.log(`📋 准备发布版本: v${currentVersion}`);

    // 验证版本号格式
    this.validateVersion(currentVersion);

    // 检查该版本是否已经发布过
    if (this.checkTagExists(`v${currentVersion}`)) {
      console.error(`❌ 版本 v${currentVersion} 已经发布过`);
      console.log('💡 请更新 package.json 中的版本号，或删除已有标签:');
      console.log(`   git tag -d v${currentVersion}`);
      console.log(`   git push origin :refs/tags/v${currentVersion}`);
      process.exit(1);
    }

    // 检查工作目录（除非强制执行）
    if (!options.force && !this.checkWorkingDirectory()) {
      console.error('❌ 工作目录有未提交的变更');
      console.log('💡 请先提交所有变更，或使用 --force 标志');
      process.exit(1);
    }

    try {
      console.log(`✅ 开始发布版本: v${currentVersion}`);

      // 提交变更（如果有的话）
      this.commitChanges(currentVersion);

      // 创建并推送标签
      this.createAndPushTag(currentVersion);

      // 显示发布信息
      this.showReleaseInfo(currentVersion);
    } catch (error) {
      console.error('❌ 发布过程中出现错误:', error.message);
      process.exit(1);
    }
  }
}

// 命令行参数处理
function parseArguments() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🚀 自动化发布脚本

用法:
  node scripts/release.js [options]
  npm run release [-- options]

选项:
  --force       忽略未提交的变更警告
  --help, -h    显示帮助信息

示例:
  node scripts/release.js
  node scripts/release.js --force
  npm run release
  npm run release -- --force

发布流程:
  1. 读取 package.json 中的版本号
  2. 检查该版本是否已发布
  3. 提交变更到 git
  4. 创建版本标签
  5. 推送到远程仓库
  6. 触发 GitHub Actions 自动构建和发布

注意:
  发布前请先手动更新 package.json 中的版本号
    `);
    process.exit(0);
  }

  const options = {
    force: args.includes('--force'),
  };

  return { options };
}

// 主程序入口
async function main() {
  try {
    const { options } = parseArguments();
    const releaseManager = new ReleaseManager();
    await releaseManager.release(options);
  } catch (error) {
    console.error('❌ 发布失败:', error.message);
    process.exit(1);
  }
}

// 运行主程序
// 检查是否直接运行此脚本（而非被导入）
const scriptPath = fileURLToPath(import.meta.url);
const isMainModule =
  process.argv[1] && path.resolve(process.argv[1]) === scriptPath;

if (isMainModule) {
  main();
}

export default ReleaseManager;
