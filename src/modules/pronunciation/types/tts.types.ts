/**
 * TTS相关类型定义
 */

// TTS结果
export interface TTSResult {
  success: boolean;
  error?: string;
}

// TTS提供者类型
export type TTSProviderType = 'web-speech' | 'youdao';

// TTS提供者状态
export interface TTSProviderStatus {
  name: string;
  available: boolean;
  speaking: boolean;
}
