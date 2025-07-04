/**
 * 通用API服务使用示例
 * 展示如何使用UniversalApiService进行各种业务场景的AI调用
 */

import { universalApi, callAI, quickAI } from '../services/UniversalApiService';
import { TranslationProvider } from '../../shared/types/core';

/**
 * 基础使用示例
 */
export class UniversalApiUsageExamples {
  /**
   * 示例1: 基本文本分析
   */
  static async textAnalysis() {
    const result = await callAI(
      '请分析以下文本的情感倾向：这是一个非常棒的产品，我很满意！',
      {
        systemPrompt:
          '你是一个专业的文本情感分析师，请对用户提供的文本进行情感分析。',
        temperature: 0.3,
      },
    );

    console.log('文本分析结果:', result.content);
    return result;
  }

  /**
   * 示例2: 内容生成
   */
  static async contentGeneration() {
    const result = await universalApi.call('为一款智能手表写一段产品介绍', {
      systemPrompt: '你是一名专业的产品文案撰写师，擅长写出吸引人的产品介绍。',
      temperature: 0.8,
      maxTokens: 500,
    });

    console.log('生成的产品介绍:', result.content);
    return result;
  }

  /**
   * 示例3: 代码解释
   */
  static async codeExplanation() {
    const code = `
    function fibonacci(n) {
      if (n <= 1) return n;
      return fibonacci(n - 1) + fibonacci(n - 2);
    }
    `;

    const result = await quickAI(
      `请解释这段代码的功能和工作原理：\n${code}`,
      '你是一名编程教师，擅长用简单易懂的方式解释代码。',
    );

    console.log('代码解释:', result.content);
    return result;
  }

  /**
   * 示例4: 数据处理建议
   */
  static async dataProcessingAdvice() {
    const result = await universalApi.call(
      '我有一个包含100万条用户行为数据的CSV文件，需要进行清洗和分析，请给出具体的处理建议',
      {
        systemPrompt: '你是一名数据分析专家，精通数据清洗和分析方法。',
        temperature: 0.5,
        configId: 'specific-config-id', // 可以指定特定的API配置
      },
    );

    console.log('数据处理建议:', result.content);
    return result;
  }

  /**
   * 示例5: 聊天对话
   */
  static async chatConversation() {
    const messages = [
      {
        role: 'system' as const,
        content: '你是一个友善的AI助手，专门帮助用户解决技术问题。',
      },
      {
        role: 'user' as const,
        content: '我在学习React，但是对useState钩子不太理解',
      },
      {
        role: 'assistant' as const,
        content:
          'useState是React中最基础的Hook之一，它让函数组件能够拥有状态...',
      },
      { role: 'user' as const, content: '能举个具体的例子吗？' },
    ];

    const result = await universalApi.chat(messages, {
      temperature: 0.7,
      maxTokens: 800,
    });

    console.log('聊天回复:', result.content);
    return result;
  }

  /**
   * 示例6: 使用特定Provider
   */
  static async useSpecificProvider() {
    const result = await callAI('请用诗歌的形式描述春天的美好', {
      systemPrompt: '你是一位诗人，擅长创作优美的诗歌。',
      forceProvider: TranslationProvider.GoogleGemini, // 强制使用Google Gemini
      temperature: 0.9,
    });

    console.log('诗歌创作:', result.content);
    console.log('使用的模型:', result.model);
    console.log('使用的Provider:', result.provider);
    return result;
  }

  /**
   * 示例7: 获取原始响应数据
   */
  static async getRawResponse() {
    const result = await universalApi.call('解释什么是机器学习', {
      systemPrompt: '你是AI领域的专家。',
      rawResponse: true, // 获取原始响应数据
    });

    console.log('回答:', result.content);
    console.log('Token使用量:', result.usage);
    console.log('原始数据:', result.rawData);
    return result;
  }

  /**
   * 示例8: 错误处理
   */
  static async errorHandling() {
    // 故意传入空的prompt
    const result = await callAI('');

    if (!result.success) {
      console.log('调用失败:', result.error);
      // 处理错误逻辑
      return null;
    }

    return result;
  }

  /**
   * 示例9: 检查API可用性
   */
  static async checkAvailability() {
    const isAvailable = await universalApi.isAvailable();
    console.log('API是否可用:', isAvailable);

    if (isAvailable) {
      const models = await universalApi.getAvailableModels();
      console.log('可用的模型:', models);
    }

    return isAvailable;
  }

  /**
   * 示例10: 业务场景 - 邮件回复生成
   */
  static async emailReplyGeneration() {
    const originalEmail = `
    尊敬的客户，
    我们收到了您关于产品退货的申请。请提供您的订单号和退货原因，
    我们会尽快为您处理。

    客服团队
    `;

    const result = await callAI(
      `请帮我回复这封邮件，我的订单号是ABC123，退货原因是尺寸不合适：\n${originalEmail}`,
      {
        systemPrompt: '你是一名专业的客服人员，回复要礼貌、简洁、专业。',
        temperature: 0.6,
      },
    );

    console.log('邮件回复:', result.content);
    return result;
  }

  /**
   * 示例11: 业务场景 - SEO文章标题生成
   */
  static async seoTitleGeneration() {
    const result = await universalApi.call(
      '为一篇关于"如何提高工作效率"的文章生成5个SEO友好的标题',
      {
        systemPrompt:
          '你是一名SEO专家，擅长创建吸引点击的标题。标题要包含关键词，长度控制在60字符以内。',
        temperature: 0.8,
      },
    );

    console.log('SEO标题建议:', result.content);
    return result;
  }

  /**
   * 示例12: 业务场景 - 代码重构建议
   */
  static async codeRefactoringAdvice() {
    const code = `
    function processUserData(users) {
      var result = [];
      for (var i = 0; i < users.length; i++) {
        if (users[i].age > 18) {
          if (users[i].status === 'active') {
            result.push({
              name: users[i].name,
              email: users[i].email,
              age: users[i].age
            });
          }
        }
      }
      return result;
    }
    `;

    const result = await callAI(
      `请分析这段代码并提供重构建议，包括现代JavaScript语法和最佳实践：\n${code}`,
      {
        systemPrompt: '你是一名资深的JavaScript开发者，擅长代码重构和优化。',
        temperature: 0.4,
      },
    );

    console.log('重构建议:', result.content);
    return result;
  }
}

/**
 * 运行所有示例
 */
export async function runAllExamples() {
  console.log('=== 通用API服务使用示例 ===\n');

  // 检查API可用性
  const isAvailable = await UniversalApiUsageExamples.checkAvailability();
  if (!isAvailable) {
    console.log('API不可用，请检查配置');
    return;
  }

  try {
    await UniversalApiUsageExamples.textAnalysis();
    console.log('\n---\n');

    await UniversalApiUsageExamples.contentGeneration();
    console.log('\n---\n');

    await UniversalApiUsageExamples.codeExplanation();
    console.log('\n---\n');

    await UniversalApiUsageExamples.emailReplyGeneration();
    console.log('\n---\n');

    await UniversalApiUsageExamples.seoTitleGeneration();
  } catch (error) {
    console.error('示例运行出错:', error);
  }
}

// 导出便捷使用方法
export { universalApi, callAI, quickAI } from '../services/UniversalApiService';
