#!/usr/bin/env node

/**
 * 自动化发布脚本
 * 简化版本发布流程：更新版本号 -> 提交 -> 创建标签 -> 推送
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ReleaseManager {
  constructor() {
    this.configPath = path.join(process.cwd(), 'wxt.config.ts');
    this.packagePath = path.join(process.cwd(), 'package.json');
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  /**
   * 交互式询问
   */
  async question(query) {
    return new Promise((resolve) => {
      this.rl.question(query, resolve);
    });
  }

  /**
   * 确认询问（y/n）
   */
  async confirm(message, defaultValue = false) {
    const defaultStr = defaultValue ? 'Y/n' : 'y/N';
    const answer = await this.question(`${message} (${defaultStr}): `);

    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      return true;
    } else if (answer.toLowerCase() === 'n' || answer.toLowerCase() === 'no') {
      return false;
    } else {
      return defaultValue;
    }
  }

  /**
   * 选择询问
   */
  async choice(message, options, defaultIndex = 0) {
    console.log(`\n${message}`);
    options.forEach((option, index) => {
      const marker = index === defaultIndex ? '→' : ' ';
      console.log(`${marker} ${index + 1}. ${option}`);
    });

    const answer = await this.question(
      `\n请选择 (1-${options.length}, 默认: ${defaultIndex + 1}): `,
    );
    const index = parseInt(answer) - 1;

    if (isNaN(index) || index < 0 || index >= options.length) {
      return defaultIndex;
    }

    return index;
  }

  /**
   * 关闭交互界面
   */
  closeInterface() {
    this.rl.close();
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
        stdio: 'pipe',
      });
      return true;
    } catch {
      // 标签不存在是正常情况，返回 false
      return false;
    }
  }

  /**
   * 检查命令行工具是否可用
   */
  isCommandAvailable(command) {
    try {
      // 使用 'pipe' 来抑制输出，同时如果命令不存在会抛出错误
      execSync(`${command} --version`, { stdio: 'pipe' });
      return true;
    } catch (_error) {
      return false;
    }
  }

  /**
   * 删除标签
   */
  deleteReleaseAssets(version) {
    const tag = `v${version}`;
    console.log(`🗑️  删除已存在的 Release 和标签: ${tag}`);

    // 检查 gh 是否可用
    if (this.isCommandAvailable('gh')) {
      try {
        // 删除 GitHub Release
        console.log('💥 正在删除 GitHub Release...');
        this.exec(`gh repo set-default xiao-zaiyi/illa-helper`);
        this.exec(`gh release delete ${tag} --yes`);
        console.log('✅ GitHub Release 删除成功');
      } catch (_error) {
        console.log('ℹ️ GitHub Release 不存在或删除失败，跳过');
      }
    } else {
      console.log(
        "⚠️ GitHub CLI ('gh') 未安装或不在 PATH 中，将跳过删除 Release 的步骤。",
      );
      console.log('   请访问 https://cli.github.com/ 进行安装。');
    }

    try {
      // 删除本地标签
      this.exec(`git tag -d ${tag}`);
      console.log('✅ 本地标签删除成功');
    } catch (_error) {
      console.log('ℹ️ 本地标签不存在，跳过');
    }

    try {
      // 删除远程标签
      this.exec(`git push origin :refs/tags/${tag}`);
      console.log('✅ 远程标签删除成功');
    } catch (_error) {
      console.log('ℹ️ 远程标签不存在，跳过');
    }
  }

  /**
   * 提交变更（如果有的话）
   */
  async commitChanges(version) {
    // 检查是否有变更需要提交
    if (this.checkWorkingDirectory()) {
      console.log('ℹ️ 工作目录干净，无需提交变更');
      return;
    }

    console.log('📤 提交版本变更...');

    // 显示即将提交的文件
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf8' });
      console.log('📄 即将提交的文件:');
      status
        .split('\n')
        .filter((line) => line.trim())
        .forEach((line) => {
          console.log(`   ${line}`);
        });
    } catch (_error) {
      // 忽略错误，继续执行
    }

    this.exec(`git add .`);
    this.exec(`git commit -m "🔖 发布版本 v${version}"`);
    console.log('✅ 变更提交成功');
  }

  /**
   * 创建并推送标签
   */
  createAndPushTag(version) {
    const tag = `v${version}`;

    // 由于主流程已处理标签冲突，这里只是警告提示
    if (this.checkTagExists(tag)) {
      console.log(`ℹ️ 标签 ${tag} 仍然存在，尝试删除后重新创建...`);
      try {
        this.exec(`git tag -d ${tag}`, false);
      } catch (_error) {
        // 忽略删除失败，继续尝试创建
      }
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
    try {
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

      // 发布前确认
      if (!options.force) {
        const confirmed = await this.confirm(
          `\n🎯 确认发布版本 v${currentVersion}？`,
          true,
        );
        if (!confirmed) {
          console.log('❌ 发布已取消');
          return;
        }
      }

      // 检查该版本是否已经发布过
      if (this.checkTagExists(`v${currentVersion}`)) {
        console.log(`⚠️ 版本 v${currentVersion} 已经发布过`);
        const deleteConfirmed = await this.confirm(
          '🗑️ 是否删除已有标签和 GitHub Release 然后重新发布？',
          true,
        );
        if (deleteConfirmed) {
          this.deleteReleaseAssets(currentVersion);
          console.log(`✅ 已删除已有版本，继续发布流程`);
        } else {
          console.log('❌ 发布已取消');
          return;
        }
      }

      // 检查工作目录
      if (!this.checkWorkingDirectory()) {
        const choice = await this.choice(
          '⚠️ 工作目录有未提交的变更，请选择操作：',
          [
            '取消发布，手动提交后再试',
            '自动提交变更并继续',
            '忽略变更强制发布',
          ],
          0,
        );

        switch (choice) {
          case 0:
            console.log('❌ 发布已取消，请先提交变更');
            return;
          case 1:
            console.log('📝 将自动提交变更...');
            break;
          case 2:
            console.log('⚠️ 忽略变更强制发布...');
            options.force = true;
            break;
        }
      }

      console.log(`\n✅ 开始发布版本: v${currentVersion}`);

      // 提交变更（如果有的话）
      await this.commitChanges(currentVersion);

      // 最终确认
      const finalConfirm = await this.confirm(
        '\n🚨 最后确认：即将推送到远程仓库并触发自动构建，是否继续？',
        true,
      );
      if (!finalConfirm) {
        console.log('❌ 发布已取消');
        return;
      }

      // 创建并推送标签
      this.createAndPushTag(currentVersion);

      // 显示发布信息
      this.showReleaseInfo(currentVersion);
    } catch (error) {
      console.error('❌ 发布过程中出现错误:', error.message);
      process.exit(1);
    } finally {
      this.closeInterface();
    }
  }
}

// 命令行参数处理
function parseArguments() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🚀 交互式自动化发布脚本

用法:
  node scripts/release.js [options]
  npm run release [-- options]

选项:
  --force       跳过所有交互确认，强制执行
  --help, -h    显示帮助信息

示例:
  node scripts/release.js          # 交互式发布
  node scripts/release.js --force  # 强制发布（无交互）
  npm run release                  # 交互式发布
  npm run release -- --force      # 强制发布（无交互）

交互式功能:
  ✅ 发布前确认版本信息
  ✅ 版本冲突时提供选择（取消/删除/强制）
  ✅ 未提交变更时提供选择（取消/提交/忽略）
  ✅ 推送前最终确认
  ✅ 显示即将提交的文件列表

发布流程:
  1. 读取 package.json 中的版本号
  2. 交互确认发布信息
  3. 智能处理版本冲突和变更
  4. 提交变更到 git（如需要）
  5. 创建版本标签
  6. 推送到远程仓库
  7. 触发 GitHub Actions 自动构建和发布

注意:
  发布前请先手动更新 package.json 中的版本号
  使用 Ctrl+C 可以随时取消发布流程
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
