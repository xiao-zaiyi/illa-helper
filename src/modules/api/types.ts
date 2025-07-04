/**
 * API模块类型定义
 */

import { FullTextAnalysisResponse } from '../shared/types/api';
import { UserSettings } from '../shared/types/storage';

/**
 * 翻译提供者接口
 */
export interface ITranslationProvider {
  analyzeFullText(
    text: string,
    settings: UserSettings,
  ): Promise<FullTextAnalysisResponse>;
}

/**
 * API请求配置
 */
export interface ApiRequestConfig {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  timeout: number;
}

/**
 * 后台代理响应
 */
export interface BackgroundProxyResponse {
  success: boolean;
  data?: any;
  error?: {
    status?: number;
    statusText?: string;
    message?: string;
  };
}
