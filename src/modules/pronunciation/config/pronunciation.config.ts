/**
 * 发音模块配置定义
 */

import { CACHE_CONSTANTS, PROVIDER_CONSTANTS } from './constants';
import type { TooltipHotkey } from '../../shared/types/ui';
import { DEFAULT_TOOLTIP_HOTKEY } from '../../shared/constants/defaults';

// TTS配置
export interface TTSConfig {
  provider: 'web-speech' | 'youdao';
  // Web Speech API配置
  lang?: string;
  voice?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
  // 有道TTS配置
  accent?: 'us' | 'uk'; // 美式或英式发音
}

// 发音UI配置
export interface PronunciationUIConfig {
  showPhonetic: boolean;
  showPlayButton: boolean;
  tooltipEnabled: boolean;
  inlineDisplay: boolean;
  hotkey?: TooltipHotkey; // 快捷键配置
}

// 发音服务配置
export interface PronunciationConfig {
  provider: string;
  apiEndpoint?: string;
  cacheEnabled: boolean;
  cacheTTL: number; // 缓存生存时间(秒)
  ttsConfig: TTSConfig;
  uiConfig: PronunciationUIConfig;
}

// 默认TTS配置
export const DEFAULT_TTS_CONFIG: TTSConfig = {
  provider: PROVIDER_CONSTANTS.DEFAULT_TTS_PROVIDER as 'youdao',
  lang: 'en-US',
  rate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  accent: 'us',
};

// 默认UI配置
export const DEFAULT_UI_CONFIG: PronunciationUIConfig = {
  showPhonetic: true,
  showPlayButton: true,
  tooltipEnabled: true,
  inlineDisplay: false, // 禁用内联显示，只在悬浮框中显示
  hotkey: DEFAULT_TOOLTIP_HOTKEY,
};

// 默认发音配置
export const DEFAULT_PRONUNCIATION_CONFIG: PronunciationConfig = {
  provider: PROVIDER_CONSTANTS.DEFAULT_PHONETIC_PROVIDER,
  cacheEnabled: true,
  cacheTTL: CACHE_CONSTANTS.DEFAULT_TTL,
  ttsConfig: DEFAULT_TTS_CONFIG,
  uiConfig: DEFAULT_UI_CONFIG,
};

// 配置验证器
export class ConfigValidator {
  /**
   * 验证TTS配置
   */
  static validateTTSConfig(config: Partial<TTSConfig>): boolean {
    if (
      config.provider &&
      !['web-speech', 'youdao'].includes(config.provider)
    ) {
      return false;
    }

    if (config.accent && !['us', 'uk'].includes(config.accent)) {
      return false;
    }

    if (config.rate && (config.rate < 0.1 || config.rate > 10)) {
      return false;
    }

    if (config.pitch && (config.pitch < 0 || config.pitch > 2)) {
      return false;
    }

    if (config.volume && (config.volume < 0 || config.volume > 1)) {
      return false;
    }

    return true;
  }

  /**
   * 验证发音配置
   */
  static validatePronunciationConfig(
    config: Partial<PronunciationConfig>,
  ): boolean {
    if (config.cacheTTL && config.cacheTTL < 0) {
      return false;
    }

    if (config.ttsConfig && !this.validateTTSConfig(config.ttsConfig)) {
      return false;
    }

    return true;
  }
}

// 配置合并工具
export class ConfigMerger {
  /**
   * 深度合并配置对象
   */
  static mergeConfig<T extends Record<string, any>>(
    defaultConfig: T,
    userConfig: Partial<T>,
  ): T {
    const result = { ...defaultConfig };

    for (const key in userConfig) {
      const userValue = userConfig[key];
      const defaultValue = defaultConfig[key];

      if (userValue !== undefined) {
        if (
          typeof userValue === 'object' &&
          userValue !== null &&
          !Array.isArray(userValue) &&
          typeof defaultValue === 'object' &&
          defaultValue !== null &&
          !Array.isArray(defaultValue)
        ) {
          (result as any)[key] = this.mergeConfig(defaultValue, userValue);
        } else {
          (result as any)[key] = userValue;
        }
      }
    }

    return result;
  }
}
