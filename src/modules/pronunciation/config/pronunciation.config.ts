/**
 * 发音模块配置定义
 */

import type { TooltipHotkey } from '../../shared/types/ui';
import { DEFAULT_PRONUNCIATION_HOTKEY } from '../../shared/constants/defaults';

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
  // 音标来源固定为 Dictionary API。这里不暴露假 provider 配置，避免存储层出现无效状态。
  ttsConfig: TTSConfig;
  uiConfig: PronunciationUIConfig;
}

// 默认TTS配置
export const DEFAULT_TTS_CONFIG: TTSConfig = {
  provider: 'youdao',
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
  hotkey: DEFAULT_PRONUNCIATION_HOTKEY,
};

// 默认发音配置
export const DEFAULT_PRONUNCIATION_CONFIG: PronunciationConfig = {
  ttsConfig: DEFAULT_TTS_CONFIG,
  uiConfig: DEFAULT_UI_CONFIG,
};
