/**
 * 命令服务 - 处理扩展命令
 */

import { browser } from 'wxt/browser';
import { StorageService } from '../../core/storage';
import {
  ExtensionCommand,
  CommandHandlerResult,
  CommandServiceConfig,
  ConfigValidationResult,
  EXTENSION_COMMANDS,
} from '../types';

export class CommandService {
  private static instance: CommandService | null = null;
  private config: CommandServiceConfig;
  private storageService: StorageService;

  private constructor() {
    this.config = {
      enabledCommands: ['translate-page'],
      requiresValidation: true,
    };
    this.storageService = StorageService.getInstance();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): CommandService {
    if (!CommandService.instance) {
      CommandService.instance = new CommandService();
    }
    return CommandService.instance;
  }

  /**
   * 初始化命令监听器
   */
  public initialize(): void {
    browser.commands.onCommand.addListener(this.handleCommand.bind(this));
    console.log('[CommandService] 命令监听器已初始化');
  }

  /**
   * 处理扩展命令
   */
  private async handleCommand(command: string): Promise<void> {
    console.log(`[CommandService] 收到命令: ${command}`);

    if (!this.isCommandEnabled(command as ExtensionCommand)) {
      console.warn(`[CommandService] 命令未启用: ${command}`);
      return;
    }

    try {
      const result = await this.executeCommand(command as ExtensionCommand);
      if (!result.success && result.error) {
        console.error(`[CommandService] 命令执行失败: ${result.error}`);
      }
    } catch (error) {
      console.error(`[CommandService] 命令执行异常:`, error);
    }
  }

  /**
   * 执行具体命令
   */
  private async executeCommand(
    command: ExtensionCommand,
  ): Promise<CommandHandlerResult> {
    switch (command) {
      case EXTENSION_COMMANDS.TRANSLATE_PAGE:
        return this.handleTranslatePageCommand();
      default:
        return {
          success: false,
          error: `未知命令: ${command}`,
        };
    }
  }

  /**
   * 处理翻译页面命令
   */
  private async handleTranslatePageCommand(): Promise<CommandHandlerResult> {
    try {
      // 验证API配置
      if (this.config.requiresValidation) {
        const validation = await this.validateApiConfiguration();
        if (!validation.isValid) {
          return {
            success: false,
            error: 'API配置无效',
          };
        }
      }

      // 获取当前活动标签页
      const tabs = await browser.tabs.query({
        active: true,
        currentWindow: true,
      });

      if (!tabs[0]?.id) {
        return {
          success: false,
          error: '无法获取当前标签页',
        };
      }

      // 向content script发送翻译命令
      await browser.tabs.sendMessage(tabs[0].id, {
        type: 'translate-page-command',
      });
      return {
        success: true,
      };
    } catch (error) {
      console.error('[CommandService] 翻译页面命令执行失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 验证API配置
   */
  private async validateApiConfiguration(): Promise<ConfigValidationResult> {
    try {
      const settings = await this.storageService.getUserSettings();

      // 检查多配置系统中的活跃配置
      const activeConfig = settings.apiConfigs?.find(
        (config) => config.id === settings.activeApiConfigId,
      );

      const isValid = !!activeConfig?.config?.apiKey;

      if (!isValid) {
        return {
          isValid: false,
          errors: ['API密钥未设置'],
        };
      }

      return {
        isValid: true,
        activeConfig: {
          id: activeConfig.id,
          provider: activeConfig.provider,
          hasApiKey: !!activeConfig.config.apiKey,
        },
        errors: [],
      };
    } catch (error) {
      console.error('[CommandService] 配置验证失败:', error);
      return {
        isValid: false,
        errors: ['配置验证过程中发生错误'],
      };
    }
  }

  /**
   * 检查命令是否启用
   */
  private isCommandEnabled(command: ExtensionCommand): boolean {
    return this.config.enabledCommands.includes(command);
  }

  /**
   * 启用命令
   */
  public enableCommand(command: ExtensionCommand): void {
    if (!this.config.enabledCommands.includes(command)) {
      this.config.enabledCommands.push(command);
      console.log(`[CommandService] 命令已启用: ${command}`);
    }
  }

  /**
   * 禁用命令
   */
  public disableCommand(command: ExtensionCommand): void {
    const index = this.config.enabledCommands.indexOf(command);
    if (index > -1) {
      this.config.enabledCommands.splice(index, 1);
      console.log(`[CommandService] 命令已禁用: ${command}`);
    }
  }

  /**
   * 获取启用的命令列表
   */
  public getEnabledCommands(): ExtensionCommand[] {
    return [...this.config.enabledCommands];
  }

  /**
   * 设置是否需要验证
   */
  public setRequiresValidation(requiresValidation: boolean): void {
    this.config.requiresValidation = requiresValidation;
    console.log(`[CommandService] 验证要求已设置为: ${requiresValidation}`);
  }

  /**
   * 手动执行命令（供其他服务调用）
   */
  public async executeManualCommand(
    command: ExtensionCommand,
  ): Promise<CommandHandlerResult> {
    console.log(`[CommandService] 手动执行命令: ${command}`);

    if (!this.isCommandEnabled(command)) {
      return {
        success: false,
        error: `命令未启用: ${command}`,
      };
    }

    return this.executeCommand(command);
  }

  /**
   * 获取可用命令列表
   */
  public getAvailableCommands(): ExtensionCommand[] {
    return Object.values(EXTENSION_COMMANDS) as ExtensionCommand[];
  }

  /**
   * 更新配置
   */
  public updateConfig(newConfig: Partial<CommandServiceConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };
    console.log('[CommandService] 配置已更新:', this.config);
  }

  /**
   * 获取当前配置
   */
  public getConfig(): CommandServiceConfig {
    return { ...this.config };
  }

  /**
   * 获取命令统计信息
   */
  public getCommandStats(): {
    enabledCommands: number;
    totalCommands: number;
    requiresValidation: boolean;
  } {
    return {
      enabledCommands: this.config.enabledCommands.length,
      totalCommands: this.getAvailableCommands().length,
      requiresValidation: this.config.requiresValidation,
    };
  }

  /**
   * 销毁服务
   */
  public destroy(): void {
    // Chrome extensions API 不提供移除监听器的方法
    // 这里只是清理实例
    console.log('[CommandService] 服务已销毁');
    CommandService.instance = null;
  }
}
