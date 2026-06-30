import { ApiConfig, ApiConfigItem, ApiProtocolFamily } from './types/api';

export type ApiPresetKey =
  | 'openai'
  | 'deepseek'
  | 'silicon-flow'
  | 'gemini'
  | 'custom-openai';

export interface ApiPresetDefinition {
  key: ApiPresetKey;
  label: string;
  protocolFamily: ApiProtocolFamily;
  apiEndpoint: string;
  defaultModel: string;
}

export const API_PRESETS: Record<ApiPresetKey, ApiPresetDefinition> = {
  openai: {
    key: 'openai',
    label: 'OpenAI',
    protocolFamily: ApiProtocolFamily.OPENAI_COMPATIBLE,
    apiEndpoint: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
  },
  deepseek: {
    key: 'deepseek',
    label: 'DeepSeek',
    protocolFamily: ApiProtocolFamily.OPENAI_COMPATIBLE,
    apiEndpoint: 'https://api.deepseek.com/v1/chat/completions',
    defaultModel: 'deepseek-chat',
  },
  'silicon-flow': {
    key: 'silicon-flow',
    label: 'Silicon Flow',
    protocolFamily: ApiProtocolFamily.OPENAI_COMPATIBLE,
    apiEndpoint: 'https://api.siliconflow.cn/v1/chat/completions',
    defaultModel: 'qwen/Qwen2.5-7B-Instruct',
  },
  gemini: {
    key: 'gemini',
    label: 'Google Gemini',
    protocolFamily: ApiProtocolFamily.GEMINI,
    apiEndpoint: '',
    defaultModel: 'gemini-2.5-flash-lite-preview-06-17',
  },
  'custom-openai': {
    key: 'custom-openai',
    label: 'Custom OpenAI-Compatible',
    protocolFamily: ApiProtocolFamily.OPENAI_COMPATIBLE,
    apiEndpoint: '',
    defaultModel: '',
  },
};

export function createEmptyApiConfig(): ApiConfig {
  return {
    apiKey: '',
    apiEndpoint: '',
    model: '',
    temperature: 0,
    enable_thinking: false,
    includeThinkingParam: false,
    customParams: '',
    phraseEnabled: true,
    requestsPerSecond: 0,
    useBackgroundProxy: true,
  };
}

export function normalizeApiProtocolFamily(
  value: unknown,
): ApiProtocolFamily | null {
  if (typeof value !== 'string') {
    return null;
  }

  switch (value.trim().toLowerCase()) {
    case ApiProtocolFamily.OPENAI_COMPATIBLE:
    case 'openai':
    case 'deepseek':
    case 'silicon-flow':
    case 'siliconflow':
    case 'custom':
      return ApiProtocolFamily.OPENAI_COMPATIBLE;
    case ApiProtocolFamily.GEMINI:
    case 'googlegemini':
    case 'proxygemini':
    case 'google-gemini':
      return ApiProtocolFamily.GEMINI;
    default:
      return null;
  }
}

export function getProtocolFamilyLabel(
  protocolFamily: ApiProtocolFamily,
): string {
  return protocolFamily === ApiProtocolFamily.GEMINI
    ? 'Gemini'
    : 'OpenAI Compatible';
}

export function isGeminiFamily(protocolFamily: ApiProtocolFamily): boolean {
  return protocolFamily === ApiProtocolFamily.GEMINI;
}

export function sanitizeApiConfig(rawConfig?: Partial<ApiConfig>): ApiConfig {
  return {
    ...createEmptyApiConfig(),
    ...rawConfig,
    apiKey: rawConfig?.apiKey?.trim() || '',
    apiEndpoint: rawConfig?.apiEndpoint?.trim() || '',
    model: rawConfig?.model?.trim() || '',
    temperature: rawConfig?.temperature ?? 0,
    customParams: rawConfig?.customParams ?? '',
    phraseEnabled: rawConfig?.phraseEnabled ?? true,
    requestsPerSecond: rawConfig?.requestsPerSecond ?? 0,
    includeThinkingParam: rawConfig?.includeThinkingParam ?? false,
    enable_thinking: rawConfig?.enable_thinking ?? false,
    useBackgroundProxy: true,
  };
}

export function supportsConnectionTest(config: ApiConfigItem): boolean {
  return (
    !!config.config.apiKey &&
    (isGeminiFamily(config.protocolFamily) || !!config.config.apiEndpoint)
  );
}
