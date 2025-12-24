/**
 * 通用大模型API服务
 * 提供简单易用的大模型调用接口，适用于各种业务场景
 *
 * 支持负载均衡功能：
 * - 多API Key轮询调度
 * - 自动故障转移
 * - 可重试错误识别
 */

import { StorageService } from '../../core/storage';
import { sendApiRequest } from '../utils/requestUtils';
import { mergeCustomParams } from '../utils/apiUtils';
import { ApiConfigItem, ApiConfig } from '../../shared/types/api';
import { TranslationProvider } from '../../shared/types/core';
import { getApiTimeout } from '@/src/utils';
import { GoogleGenerativeAI } from '@google/generative-ai';

// 负载均衡模块
import {
  ServiceDispatcher,
  FailoverExecutor,
  RetryableError,
} from '../loadbalancer';

/**
 * 通用API请求选项
 */
export interface UniversalApiOptions {
  /** 系统提示词 */
  systemPrompt?: string;
  /** 模型温度 (0-2，默认0.7) */
  temperature?: number;
  /** 最大输出Token数 */
  maxTokens?: number;
  /** 指定使用的API配置ID */
  configId?: string;
  /** 强制使用特定的Provider */
  forceProvider?: TranslationProvider;
  /** 请求超时时间(毫秒，默认0无限制) */
  timeout?: number;
  /** 自定义请求参数 JSON字符串 */
  customParams?: string;
  /** 是否返回原始响应 */
  rawResponse?: boolean;
}

/**
 * 通用API响应结果
 */
export interface UniversalApiResult {
  /** 是否成功 */
  success: boolean;
  /** 用户输入的原始prompt */
  prompt: string;
  /** AI生成的响应内容 */
  content: string;
  /** 使用的模型名称 */
  model?: string;
  /** 使用的Provider名称 */
  provider?: string;
  /** Token使用情况 */
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  /** 原始API响应(当rawResponse=true时) */
  rawData?: any;
  /** 错误信息(失败时) */
  error?: string;
  /** 负载均衡：实际使用的配置ID */
  usedConfigId?: string;
  /** 负载均衡：实际使用的配置名称 */
  usedConfigName?: string;
  /** 负载均衡：尝试次数 */
  attempts?: number;
}

/**
 * 通用大模型API服务类
 */
export class UniversalApiService {
  private static instance: UniversalApiService | null = null;
  private storageService: StorageService;

  // ===== 负载均衡组件 =====
  private dispatcher: ServiceDispatcher;
  private failoverExecutor: FailoverExecutor;

  /** 是否启用负载均衡（多配置轮询） */
  private enableLoadBalancing: boolean = true;

  private constructor() {
    this.storageService = StorageService.getInstance();
    this.dispatcher = ServiceDispatcher.getInstance();
    this.failoverExecutor = FailoverExecutor.getInstance();
  }

  /**
   * 获取单例实例
   */
  static getInstance(): UniversalApiService {
    if (!UniversalApiService.instance) {
      UniversalApiService.instance = new UniversalApiService();
    }
    return UniversalApiService.instance;
  }

  /**
   * 通用的大模型调用方法（支持负载均衡）
   *
   * 调用流程：
   * 1. 获取所有启用的API配置
   * 2. 使用调度器进行轮询选择
   * 3. 执行API调用，失败时自动故障转移
   *
   * @param prompt 用户输入的提示词
   * @param options 可选配置
   * @returns API响应结果
   */
  async call(
    prompt: string,
    options: UniversalApiOptions = {},
  ): Promise<UniversalApiResult> {
    try {
      // 验证输入
      if (!prompt?.trim()) {
        return {
          success: false,
          prompt: prompt || '',
          content: '',
          error: '输入提示词不能为空',
        };
      }

      // 如果指定了特定配置ID，直接使用该配置（不走负载均衡）
      if (options.configId) {
        const apiConfig = await this.getApiConfig(options.configId);
        if (!apiConfig) {
          return {
            success: false,
            prompt,
            content: '',
            error: `指定的API配置(${options.configId})不存在`,
          };
        }
        return await this.executeWithConfig(prompt, apiConfig, options);
      }

      // 使用负载均衡
      return await this.callWithLoadBalancing(prompt, options);
    } catch (error: any) {
      console.error('UniversalApiService调用失败:', error);
      return {
        success: false,
        prompt,
        content: '',
        error: error.message || '调用过程中发生未知错误',
      };
    }
  }

  /**
   * 带负载均衡的调用方法
   * @param prompt 提示词
   * @param options 选项
   */
  private async callWithLoadBalancing(
    prompt: string,
    options: UniversalApiOptions,
  ): Promise<UniversalApiResult> {
    // 获取所有启用的配置
    const enabledConfigs = await this.dispatcher.getEnabledConfigs(
      options.forceProvider?.toString(),
    );

    if (enabledConfigs.length === 0) {
      return {
        success: false,
        prompt,
        content: '',
        error: '无可用的API配置（所有配置已禁用或处于冷却期）',
      };
    }

    console.log(
      `[UniversalApiService] 负载均衡: 发现 ${enabledConfigs.length} 个启用的配置`,
      enabledConfigs.map((c) => `${c.name}(${c.provider})`).join(', '),
    );

    if (enabledConfigs.length === 1) {
      console.warn(
        '[UniversalApiService] 警告: 只有1个配置启用，无法进行故障转移！建议启用更多配置。',
      );
    }

    // 使用故障转移执行器
    const failoverResult = await this.failoverExecutor.executeWithFailover(
      async (config: ApiConfigItem) => {
        console.log(
          `[UniversalApiService] 正在尝试配置: ${config.name} (${config.id})`,
        );
        const result = await this.executeWithConfig(prompt, config, options);

        // 如果API调用返回失败，抛出可重试错误
        if (!result.success) {
          console.warn(
            `[UniversalApiService] 配置 ${config.name} 调用失败: ${result.error}`,
          );
          throw new RetryableError(
            result.error || 'API调用失败',
            undefined,
            true, // 标记为可重试
          );
        }

        return result;
      },
      enabledConfigs,
      { verbose: true },
    );

    if (failoverResult.success && failoverResult.data) {
      return {
        ...failoverResult.data,
        usedConfigId: failoverResult.usedConfigId,
        usedConfigName: failoverResult.usedConfigName,
        attempts: failoverResult.attempts,
      };
    } else {
      return {
        success: false,
        prompt,
        content: '',
        error: failoverResult.error || '所有API配置均调用失败',
        attempts: failoverResult.attempts,
      };
    }
  }

  /**
   * 使用指定配置执行调用
   * @param prompt 提示词
   * @param apiConfig API配置
   * @param options 选项
   */
  private async executeWithConfig(
    prompt: string,
    apiConfig: ApiConfigItem,
    options: UniversalApiOptions,
  ): Promise<UniversalApiResult> {
    if (
      apiConfig.provider === 'GoogleGemini' ||
      apiConfig.provider === 'ProxyGemini'
    ) {
      return await this.callGoogleGemini(prompt, apiConfig, options);
    } else {
      return await this.callHttpApi(prompt, apiConfig, options);
    }
  }

  /**
   * 调用Google Gemini SDK
   */
  private async callGoogleGemini(
    prompt: string,
    apiConfig: ApiConfigItem,
    options: UniversalApiOptions,
  ): Promise<UniversalApiResult> {
    try {
      const config = apiConfig.config;
      const genAI = new GoogleGenerativeAI(config.apiKey);

      // 基础生成配置
      const baseGenerationConfig: any = {
        temperature: options.temperature ?? config.temperature ?? 0.7,
      };

      if (options.maxTokens) {
        baseGenerationConfig.maxOutputTokens = options.maxTokens;
      }

      // 从 customParams 合并额外参数
      const generationConfig = mergeCustomParams(
        baseGenerationConfig,
        options.customParams || config.customParams,
      );

      // 请求选项，如超时和代理端点
      const requestOptions: { timeout?: number; baseUrl?: string } = {};
      const timeout = options.timeout ?? getApiTimeout(0);
      if (timeout && timeout > 0) {
        requestOptions.timeout = timeout;
      }
      if (config.apiEndpoint) {
        requestOptions.baseUrl = config.apiEndpoint;
      }

      const model = genAI.getGenerativeModel(
        {
          model: config.model,
          generationConfig,
        },
        requestOptions,
      );

      // 构建完整提示词
      let fullPrompt = prompt;
      if (options.systemPrompt) {
        fullPrompt = `${options.systemPrompt}\n\n${prompt}`;
      }

      console.log('Google Gemini调用:', {
        model: config.model,
        prompt: fullPrompt,
        config: generationConfig,
      });

      const result = await model.generateContent(fullPrompt);
      const response = result.response;
      const content = response.text();

      console.log('Google Gemini响应:', content);

      // 构建返回结果
      const apiResult: UniversalApiResult = {
        success: true,
        prompt,
        content,
        model: config.model,
        provider: this.getProviderDisplayName(apiConfig.provider),
      };

      // 添加Token使用信息（如果有）
      if (response.usageMetadata) {
        apiResult.usage = {
          promptTokens: response.usageMetadata.promptTokenCount,
          completionTokens: response.usageMetadata.candidatesTokenCount,
          totalTokens: response.usageMetadata.totalTokenCount,
        };
      }

      // 如果需要原始响应
      if (options.rawResponse) {
        apiResult.rawData = {
          candidates: response.candidates,
          usageMetadata: response.usageMetadata,
        };
      }

      return apiResult;
    } catch (error: any) {
      console.error('Google Gemini调用失败:', error);
      return {
        success: false,
        prompt,
        content: '',
        error: error.message || 'Google Gemini调用失败',
      };
    }
  }

  /**
   * 调用HTTP API (OpenAI兼容格式)
   */
  private async callHttpApi(
    prompt: string,
    apiConfig: ApiConfigItem,
    options: UniversalApiOptions,
  ): Promise<UniversalApiResult> {
    try {
      // 构建请求参数
      const requestBody = this.buildRequestBody(
        prompt,
        apiConfig.config,
        options,
      );

      console.log('HTTP API调用:', {
        provider: apiConfig.provider,
        endpoint: apiConfig.config.apiEndpoint,
        body: requestBody,
      });

      // 发送API请求
      const response = await this.sendRequest(
        requestBody,
        apiConfig.config,
        options.timeout,
      );

      if (!response.ok) {
        // 引入 RetryableError 并设置状态码，保证故障转移逻辑能识别
        const retryableError = new RetryableError(
          `API请求失败: ${response.status} ${response.statusText}`,
          response.status,
          true, // 标记为可重试，让故障转移尝试下一个配置
        );
        throw retryableError;
      }

      const data = await response.json();

      console.log('HTTP API响应:', data);

      // 解析响应
      return this.parseResponse(data, prompt, apiConfig, options.rawResponse);
    } catch (error: any) {
      console.error('HTTP API调用失败:', error);
      return {
        success: false,
        prompt,
        content: '',
        error: error.message || 'HTTP API调用失败',
      };
    }
  }

  /**
   * 快速调用方法(使用默认配置)
   * @param prompt 提示词
   * @param systemPrompt 系统提示词(可选)
   * @returns API响应结果
   */
  async quickCall(
    prompt: string,
    systemPrompt?: string,
  ): Promise<UniversalApiResult> {
    return this.call(prompt, {
      systemPrompt,
      temperature: 0.7,
      maxTokens: 1000,
    });
  }

  /**
   * 聊天对话方法
   * @param messages 消息历史
   * @param options 可选配置
   * @returns API响应结果
   */
  async chat(
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
    options: UniversalApiOptions = {},
  ): Promise<UniversalApiResult> {
    try {
      const apiConfig = await this.getApiConfig(
        options.configId,
        options.forceProvider,
      );
      if (!apiConfig) {
        return {
          success: false,
          prompt: messages.map((m) => m.content).join('\n'),
          content: '',
          error: '未找到可用的API配置',
        };
      }

      // 构建聊天请求
      let requestBody: any = {
        model: apiConfig.config.model,
        messages: messages,
        temperature: options.temperature ?? apiConfig.config.temperature ?? 0.7,
      };

      if (options.maxTokens) {
        requestBody.max_tokens = options.maxTokens;
      }

      // 合并自定义参数
      if (options.customParams) {
        requestBody = mergeCustomParams(requestBody, options.customParams);
      } else if (apiConfig.config.customParams) {
        requestBody = mergeCustomParams(
          requestBody,
          apiConfig.config.customParams,
        );
      }

      const response = await this.sendRequest(
        requestBody,
        apiConfig.config,
        options.timeout,
      );

      if (!response.ok) {
        throw new Error(
          `API请求失败: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      return this.parseResponse(
        data,
        messages[messages.length - 1].content,
        apiConfig,
        options.rawResponse,
      );
    } catch (error: any) {
      return {
        success: false,
        prompt: messages.map((m) => m.content).join('\n'),
        content: '',
        error: error.message || '聊天调用失败',
      };
    }
  }

  /**
   * 检查API是否可用
   * @param configId 可选的配置ID
   * @returns 是否可用
   */
  async isAvailable(configId?: string): Promise<boolean> {
    try {
      const apiConfig = await this.getApiConfig(configId);
      return !!apiConfig?.config?.apiKey;
    } catch {
      return false;
    }
  }

  /**
   * 获取可用的模型列表
   * @returns 模型信息列表
   */
  async getAvailableModels(): Promise<
    Array<{ provider: string; model: string }>
  > {
    try {
      const userSettings = await this.storageService.getUserSettings();
      return userSettings.apiConfigs.map((config) => ({
        provider: config.provider, // 直接使用字符串，不需要转换
        model: config.config.model,
      }));
    } catch {
      return [];
    }
  }

  /**
   * 获取API配置
   */
  private async getApiConfig(
    configId?: string,
    forceProvider?: TranslationProvider,
  ): Promise<ApiConfigItem | null> {
    const userSettings = await this.storageService.getUserSettings();

    if (configId) {
      return (
        userSettings.apiConfigs.find((config) => config.id === configId) || null
      );
    }

    if (forceProvider) {
      // 将枚举值转换为字符串进行比较
      const providerString = forceProvider.toString();
      return (
        userSettings.apiConfigs.find(
          (config) => config.provider === providerString,
        ) || null
      );
    }

    // 使用当前活跃配置
    return (
      userSettings.apiConfigs.find(
        (config) => config.id === userSettings.activeApiConfigId,
      ) || null
    );
  }

  /**
   * 构建请求体
   */
  private buildRequestBody(
    prompt: string,
    config: ApiConfig,
    options: UniversalApiOptions,
  ): any {
    const messages = [];

    // 添加系统提示词
    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }

    // 添加用户提示词
    messages.push({ role: 'user', content: prompt });

    let requestBody: any = {
      model: config.model,
      messages: messages,
      temperature: options.temperature ?? config.temperature ?? 0.7,
    };

    if (options.maxTokens) {
      requestBody.max_tokens = options.maxTokens;
    }

    // 合并自定义参数
    if (options.customParams) {
      requestBody = mergeCustomParams(requestBody, options.customParams);
    } else if (config.customParams) {
      requestBody = mergeCustomParams(requestBody, config.customParams);
    }

    return requestBody;
  }

  /**
   * 发送API请求
   */
  private async sendRequest(
    requestBody: any,
    config: ApiConfig,
    timeout?: number,
  ): Promise<Response> {
    const timeoutMs = timeout ?? 0;
    return await sendApiRequest(requestBody, config, timeoutMs);
  }

  /**
   * 解析API响应
   */
  private parseResponse(
    data: any,
    prompt: string,
    apiConfig: ApiConfigItem,
    rawResponse?: boolean,
  ): UniversalApiResult {
    try {
      let content = '';
      let usage: any = undefined;

      // 根据不同的Provider解析响应格式
      if (
        apiConfig.provider === 'GoogleGemini' ||
        apiConfig.provider === 'ProxyGemini'
      ) {
        // Google Gemini格式 (包括ProxyGemini)
        content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (data.usageMetadata) {
          usage = {
            promptTokens: data.usageMetadata.promptTokenCount,
            completionTokens: data.usageMetadata.candidatesTokenCount,
            totalTokens: data.usageMetadata.totalTokenCount,
          };
        }
      } else {
        // OpenAI兼容格式 (OpenAI, DeepSeek, SiliconFlow等)
        content = data.choices?.[0]?.message?.content || '';
        if (data.usage) {
          usage = {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          };
        }
      }

      const result: UniversalApiResult = {
        success: true,
        prompt,
        content,
        model: apiConfig.config.model,
        provider: this.getProviderDisplayName(apiConfig.provider),
      };

      // 添加Token使用信息
      if (usage) {
        result.usage = usage;
      }

      // 如果需要原始响应
      if (rawResponse) {
        result.rawData = data;
      }

      return result;
    } catch (_) {
      return {
        success: false,
        prompt,
        content: '',
        error: '解析API响应失败',
      };
    }
  }

  /**
   * 获取Provider显示名称
   */
  private getProviderDisplayName(provider: string): string {
    const nameMap: Record<string, string> = {
      OpenAI: 'OpenAI',
      GoogleGemini: 'Google Gemini',
      ProxyGemini: 'Proxy Gemini',
      DeepSeek: 'DeepSeek',
      SiliconFlow: 'SiliconFlow',
    };
    return nameMap[provider] || provider;
  }
}

// 导出便捷实例和方法
export const universalApi = UniversalApiService.getInstance();

/**
 * 通用AI调用函数(全局便捷方法)
 * @param prompt 提示词
 * @param options 可选配置
 * @returns API响应结果
 */
export async function callAI(
  prompt: string,
  options?: UniversalApiOptions,
): Promise<UniversalApiResult> {
  return universalApi.call(prompt, options);
}

/**
 * 快速AI调用函数
 * @param prompt 提示词
 * @param systemPrompt 系统提示词(可选)
 * @returns API响应结果
 */
export async function quickAI(
  prompt: string,
  systemPrompt?: string,
): Promise<UniversalApiResult> {
  return universalApi.quickCall(prompt, systemPrompt);
}
