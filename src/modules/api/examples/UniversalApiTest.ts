/**
 * UniversalApiService 功能测试
 * 验证修复后的方法是否正常工作
 */

import { universalApi, callAI, quickAI } from '../services/UniversalApiService';
import { TranslationProvider } from '../../shared/types/core';

/**
 * 测试修复后的功能
 */
export class UniversalApiTest {
  /**
   * 测试获取可用模型列表
   */
  static async testGetAvailableModels() {
    console.log('=== 测试获取可用模型列表 ===');
    try {
      const models = await universalApi.getAvailableModels();
      console.log('可用模型:', models);
      return models;
    } catch (error) {
      console.error('获取模型列表失败:', error);
      return [];
    }
  }

  /**
   * 测试基本调用功能
   */
  static async testBasicCall() {
    console.log('\n=== 测试基本调用功能 ===');
    try {
      const result = await callAI('简单介绍一下JavaScript');
      console.log('调用结果:', {
        success: result.success,
        provider: result.provider,
        model: result.model,
        contentLength: result.content.length,
        hasUsage: !!result.usage,
      });
      return result;
    } catch (error) {
      console.error('基本调用失败:', error);
      return null;
    }
  }

  /**
   * 测试Google Gemini Provider
   */
  static async testGoogleGeminiProvider() {
    console.log('\n=== 测试Google Gemini Provider ===');
    try {
      const result = await callAI('Hello, how are you?', {
        forceProvider: TranslationProvider.GoogleGemini,
        systemPrompt: 'You are a helpful assistant.',
        temperature: 0.7,
      });
      console.log('Gemini调用结果:', {
        success: result.success,
        provider: result.provider,
        model: result.model,
        hasContent: !!result.content,
        hasUsage: !!result.usage,
      });
      return result;
    } catch (error) {
      console.error('Gemini调用失败:', error);
      return null;
    }
  }

  /**
   * 测试OpenAI Provider
   */
  static async testOpenAIProvider() {
    console.log('\n=== 测试OpenAI Provider ===');
    try {
      const result = await callAI('解释量子计算的基本概念', {
        forceProvider: TranslationProvider.OpenAI,
        systemPrompt: '你是一名物理学教授',
        temperature: 0.5,
        maxTokens: 200,
      });
      console.log('OpenAI调用结果:', {
        success: result.success,
        provider: result.provider,
        model: result.model,
        hasContent: !!result.content,
        hasUsage: !!result.usage,
      });
      return result;
    } catch (error) {
      console.error('OpenAI调用失败:', error);
      return null;
    }
  }

  /**
   * 测试聊天对话功能
   */
  static async testChatConversation() {
    console.log('\n=== 测试聊天对话功能 ===');
    try {
      const messages = [
        { role: 'system' as const, content: '你是一个编程助手' },
        { role: 'user' as const, content: '什么是React Hook？' },
        {
          role: 'assistant' as const,
          content: 'React Hook是React 16.8引入的新特性...',
        },
        { role: 'user' as const, content: '能举个useState的例子吗？' },
      ];

      const result = await universalApi.chat(messages, {
        temperature: 0.7,
      });

      console.log('聊天对话结果:', {
        success: result.success,
        provider: result.provider,
        hasContent: !!result.content,
        hasUsage: !!result.usage,
      });
      return result;
    } catch (error) {
      console.error('聊天对话失败:', error);
      return null;
    }
  }

  /**
   * 测试原始响应获取
   */
  static async testRawResponse() {
    console.log('\n=== 测试原始响应获取 ===');
    try {
      const result = await callAI('Hello world', {
        rawResponse: true,
        maxTokens: 50,
      });

      console.log('原始响应测试:', {
        success: result.success,
        hasRawData: !!result.rawData,
        usage: result.usage,
      });
      return result;
    } catch (error) {
      console.error('原始响应测试失败:', error);
      return null;
    }
  }

  /**
   * 测试API可用性检查
   */
  static async testApiAvailability() {
    console.log('\n=== 测试API可用性检查 ===');
    try {
      const isAvailable = await universalApi.isAvailable();
      console.log('API是否可用:', isAvailable);
      return isAvailable;
    } catch (error) {
      console.error('可用性检查失败:', error);
      return false;
    }
  }

  /**
   * 测试错误处理
   */
  static async testErrorHandling() {
    console.log('\n=== 测试错误处理 ===');
    try {
      // 测试空prompt
      const result1 = await callAI('');
      console.log('空prompt测试:', {
        success: result1.success,
        error: result1.error,
      });

      // 测试超长prompt（如果有Token限制）
      const longPrompt = 'a'.repeat(10000);
      const result2 = await callAI(longPrompt, { maxTokens: 10 });
      console.log('超长prompt测试:', {
        success: result2.success,
        hasError: !!result2.error,
      });

      return { emptyPrompt: result1, longPrompt: result2 };
    } catch (error) {
      console.error('错误处理测试失败:', error);
      return null;
    }
  }

  /**
   * 运行所有测试
   */
  static async runAllTests() {
    console.log('🚀 开始UniversalApiService功能测试\n');

    // 检查API可用性
    const isAvailable = await this.testApiAvailability();
    if (!isAvailable) {
      console.log('❌ API不可用，跳过其他测试');
      return;
    }

    // 运行各项测试
    const results = {
      models: await this.testGetAvailableModels(),
      basicCall: await this.testBasicCall(),
      googleGemini: await this.testGoogleGeminiProvider(),
      openAI: await this.testOpenAIProvider(),
      chat: await this.testChatConversation(),
      rawResponse: await this.testRawResponse(),
      errorHandling: await this.testErrorHandling(),
    };

    console.log('\n✅ 所有测试完成');
    return results;
  }
}

/**
 * 快速功能验证
 */
export async function quickFunctionTest() {
  console.log('🔍 快速功能验证');

  try {
    // 测试quickAI函数
    const result = await quickAI(
      '用一句话解释什么是TypeScript',
      '你是一名编程专家',
    );

    console.log('QuickAI测试结果:', {
      success: result.success,
      provider: result.provider,
      contentPreview: result.content.substring(0, 100) + '...',
    });

    return result;
  } catch (error) {
    console.error('快速测试失败:', error);
    return null;
  }
}

// 导出测试函数
export { UniversalApiTest as default };
