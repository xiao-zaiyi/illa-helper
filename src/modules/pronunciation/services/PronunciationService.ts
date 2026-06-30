/**
 * 发音服务主类。
 *
 * 对外保留原来的发音门面：注册元素、查询音标、朗读、更新 API/TTS/UI 配置。
 * 悬浮框 DOM 生命周期和鼠标交互已经下沉到 TooltipInteractionController。
 */

import { IPhoneticProvider, PhoneticProviderFactory } from '../phonetic';
import { ITTSProvider, TTSProviderFactory } from '../tts';
import { AITranslationProvider } from '../translation';
import { TooltipRenderer, TooltipInteractionController } from '../ui';
import { PhoneticResult, TTSResult } from '../types';
import { PronunciationConfig, DEFAULT_PRONUNCIATION_CONFIG } from '../config';
import { ApiConfigItem } from '../../shared/types/api';
import { StorageService } from '../../core/storage';
import { OriginalWordDisplayMode } from '../../shared/types/core';

export class PronunciationService {
  private config: PronunciationConfig;
  private phoneticProvider: IPhoneticProvider;
  private ttsProvider: ITTSProvider;
  private fallbackTTSProvider: ITTSProvider;
  private aiTranslationProvider: AITranslationProvider;
  private tooltipRenderer: TooltipRenderer;
  private tooltipController: TooltipInteractionController;
  private storageService: StorageService;

  constructor(
    config?: Partial<PronunciationConfig>,
    apiConfigItem?: ApiConfigItem | null,
  ) {
    this.config = { ...DEFAULT_PRONUNCIATION_CONFIG, ...config };
    this.phoneticProvider = PhoneticProviderFactory.getDefaultProvider();
    this.ttsProvider = TTSProviderFactory.createProvider(
      this.config.ttsConfig.provider,
      this.config.ttsConfig,
    );
    this.fallbackTTSProvider = TTSProviderFactory.createProvider('web-speech', {
      lang: this.config.ttsConfig.lang,
      rate: this.config.ttsConfig.rate,
      pitch: this.config.ttsConfig.pitch,
      volume: this.config.ttsConfig.volume,
    });
    this.aiTranslationProvider = new AITranslationProvider(
      apiConfigItem ?? null,
    );
    this.tooltipRenderer = new TooltipRenderer(
      this.config.uiConfig,
      OriginalWordDisplayMode.HIDDEN,
    );
    this.storageService = StorageService.getInstance();
    this.tooltipController = new TooltipInteractionController({
      getConfig: () => this.config,
      phoneticProvider: this.phoneticProvider,
      translationProvider: this.aiTranslationProvider,
      renderer: this.tooltipRenderer,
      storageService: this.storageService,
      speakText: (text) => this.speakText(text),
      speakTextWithAccent: (text, lang) => this.speakTextWithAccent(text, lang),
    });

    void this.updateOriginalWordDisplayMode();
  }

  /**
   * 为翻译元素添加发音功能。
   */
  async addPronunciationToElement(
    element: HTMLElement,
    word: string,
    isPhrase?: boolean,
  ): Promise<boolean> {
    return this.tooltipController.register(element, word, isPhrase);
  }

  /**
   * 移除元素的发音功能。
   */
  removePronunciationFromElement(element: HTMLElement): void {
    this.tooltipController.unregister(element);
  }

  /**
   * 获取单词的音标信息。
   */
  async getPhonetic(word: string): Promise<PhoneticResult> {
    return this.phoneticProvider.getPhonetic(word);
  }

  /**
   * 朗读文本。主 TTS 失败时回退到 Web Speech。
   */
  async speakText(text: string): Promise<TTSResult> {
    try {
      this.stopSpeaking();

      const primaryResult = await this.ttsProvider.speak(text);
      if (primaryResult.success) {
        return primaryResult;
      }

      console.warn(
        `主TTS提供者(${this.ttsProvider.name})失败，回退到备用提供者`,
        primaryResult.error,
      );

      if (!this.fallbackTTSProvider.isAvailable()) {
        return {
          success: false,
          error: `主TTS提供者失败且备用提供者不可用: ${primaryResult.error}`,
        };
      }

      const fallbackResult = await this.fallbackTTSProvider.speak(text);
      if (fallbackResult.success) {
        console.info(
          `TTS回退成功，使用备用提供者(${this.fallbackTTSProvider.name})`,
        );
        return { success: true };
      }

      return {
        success: false,
        error: `主TTS和备用TTS都失败: 主=${primaryResult.error}, 备用=${fallbackResult.error}`,
      };
    } catch (error) {
      console.error('TTS朗读过程中发生意外错误:', error);

      try {
        if (this.fallbackTTSProvider.isAvailable()) {
          const fallbackResult = await this.fallbackTTSProvider.speak(text);
          if (fallbackResult.success) {
            console.info('TTS异常回退成功');
            return { success: true };
          }
        }
      } catch (fallbackError) {
        console.error('备用TTS也发生异常:', fallbackError);
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : '朗读功能暂时不可用',
      };
    }
  }

  /**
   * 停止主 TTS 和备用 TTS。
   */
  stopSpeaking(): void {
    try {
      this.ttsProvider.stop();
    } catch (error) {
      console.error('停止主TTS提供者时出错:', error);
    }

    try {
      this.fallbackTTSProvider.stop();
    } catch (error) {
      console.error('停止备用TTS提供者时出错:', error);
    }
  }

  /**
   * 使用指定口音朗读文本。
   */
  async speakTextWithAccent(text: string, lang: string): Promise<TTSResult> {
    try {
      this.stopSpeaking();

      const accentMap: Record<string, 'us' | 'uk'> = {
        'en-US': 'us',
        'en-GB': 'uk',
      };
      const accent = accentMap[lang];

      if (accent && this.ttsProvider.name === 'youdao') {
        const primaryResult = await this.ttsProvider.speak(text, {
          accent,
          rate: this.config.ttsConfig.rate,
          pitch: this.config.ttsConfig.pitch,
          volume: this.config.ttsConfig.volume,
        });

        if (primaryResult.success) {
          return primaryResult;
        }

        console.warn(
          `有道TTS口音朗读失败: ${primaryResult.error}，尝试Web Speech`,
        );
      }

      const fallbackResult = await this.fallbackTTSProvider.speak(text, {
        lang,
        rate: this.config.ttsConfig.rate,
        pitch: this.config.ttsConfig.pitch,
        volume: this.config.ttsConfig.volume,
      });

      if (fallbackResult.success) {
        return fallbackResult;
      }

      console.warn('所有口音朗读方法都失败，使用默认发音');
      return await this.speakText(text);
    } catch (error) {
      console.error('口音朗读失败:', error);
      return await this.speakText(text);
    }
  }

  /**
   * 更新运行时配置。
   */
  updateConfig(config: Partial<PronunciationConfig>): void {
    this.config = { ...this.config, ...config };

    if (config.ttsConfig) {
      if (
        config.ttsConfig.provider &&
        config.ttsConfig.provider !== this.ttsProvider.name
      ) {
        this.ttsProvider = TTSProviderFactory.createProvider(
          config.ttsConfig.provider,
          config.ttsConfig,
        );
      } else {
        this.ttsProvider.updateConfig(config.ttsConfig);
      }

      this.fallbackTTSProvider.updateConfig({
        lang: config.ttsConfig.lang,
        rate: config.ttsConfig.rate,
        pitch: config.ttsConfig.pitch,
        volume: config.ttsConfig.volume,
      });
    }

    if (config.uiConfig) {
      this.tooltipRenderer.updateConfig(config.uiConfig);
      void this.updateOriginalWordDisplayMode();
    }
  }

  /**
   * 更新API配置，配置变更会立即影响 AI 释义。
   */
  async updateApiConfig(apiConfigItem?: ApiConfigItem | null): Promise<void> {
    try {
      const configToUse =
        apiConfigItem ?? (await this.storageService.getActiveApiConfigItem());
      if (configToUse) {
        this.aiTranslationProvider.updateApiConfig(configToUse);
        console.log('API配置已更新');
      } else {
        this.aiTranslationProvider.updateApiConfig(null);
        console.warn('未找到活跃的API配置');
      }
    } catch (error) {
      console.error('更新API配置失败:', error);
    }
  }

  getConfig(): PronunciationConfig {
    return { ...this.config };
  }

  getTTSProviderStatus(): {
    primary: { name: string; available: boolean; speaking: boolean };
    fallback: { name: string; available: boolean; speaking: boolean };
  } {
    return {
      primary: {
        name: this.ttsProvider.name,
        available: this.ttsProvider.isAvailable(),
        speaking: this.ttsProvider.isSpeaking(),
      },
      fallback: {
        name: this.fallbackTTSProvider.name,
        available: this.fallbackTTSProvider.isAvailable(),
        speaking: this.fallbackTTSProvider.isSpeaking(),
      },
    };
  }

  destroy(): void {
    this.tooltipController.destroy();
    this.stopSpeaking();
  }

  private async updateOriginalWordDisplayMode(): Promise<void> {
    try {
      const userSettings = await this.storageService.getUserSettings();
      const mode =
        userSettings.originalWordDisplayMode || OriginalWordDisplayMode.VISIBLE;
      this.tooltipRenderer.updateOriginalWordDisplayMode(mode);
    } catch (error) {
      console.error('更新原文显示模式失败:', error);
      this.tooltipRenderer.updateOriginalWordDisplayMode(
        OriginalWordDisplayMode.VISIBLE,
      );
    }
  }
}
