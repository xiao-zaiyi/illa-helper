<template>
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <Card
      class="w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto"
      @click.stop
      @mousedown.stop
    >
      <CardHeader>
        <div class="flex items-center justify-between">
          <CardTitle>
            {{
              isEditing
                ? $t('translationSettings.editConfig')
                : $t('translationSettings.addNewConfig')
            }}
          </CardTitle>
          <Button
            @click="$emit('cancel')"
            variant="ghost"
            size="sm"
            class="h-8 w-8 p-0"
          >
            <X class="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent class="space-y-4">
        <!-- 配置名称 -->
        <div class="space-y-2">
          <Label>{{ $t('translationSettings.configName') }}</Label>
          <Input
            v-model="formData.name"
            :placeholder="$t('translationSettings.inputConfigName')"
          />
        </div>

        <!-- 服务商选择 -->
        <div class="space-y-2">
          <Label>{{ $t('translationSettings.serviceProvider') }}</Label>
          <Select
            v-model="formData.provider"
            @update:model-value="handleProviderChange"
          >
            <SelectTrigger>
              <SelectValue
                :placeholder="$t('translationSettings.selectServiceProvider')"
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">
                {{ $t('translationSettings.openai') }}
              </SelectItem>
              <SelectItem value="deepseek">
                {{ $t('translationSettings.deepseek') }}
              </SelectItem>
              <SelectItem value="silicon-flow">
                {{ $t('translationSettings.siliconFlow') }}
              </SelectItem>
              <SelectItem value="GoogleGemini">
                {{ $t('translationSettings.googleGemini') }}
              </SelectItem>
              <SelectItem value="ProxyGemini">
                {{ $t('translationSettings.proxyGemini') }}
              </SelectItem>
              <SelectItem value="anthropic">
                {{ $t('translationSettings.anthropic') }}
              </SelectItem>
              <SelectItem value="custom">
                {{ $t('translationSettings.custom') }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- 自定义服务商名称 -->
        <div v-if="formData.provider === 'custom'" class="space-y-2">
          <Label>{{ $t('translationSettings.customProviderName') }}</Label>
          <Input
            v-model="formData.customProviderName"
            :placeholder="$t('translationSettings.inputCustomProviderName')"
          />
        </div>

        <!-- API Endpoint -->
        <div
          v-if="!['GoogleGemini', 'ProxyGemini'].includes(formData.provider)"
          class="space-y-2"
        >
          <Label>{{ $t('translationSettings.apiEndpoint') }}</Label>
          <Input
            v-model="formData.config.apiEndpoint"
            :placeholder="$t('translationSettings.apiEndpointPlaceholder')"
          />
        </div>

        <!-- Proxy Endpoint -->
        <div v-if="formData.provider === 'ProxyGemini'" class="space-y-2">
          <Label>{{ $t('translationSettings.proxyApiEndpoint') }}</Label>
          <Input
            v-model="formData.config.apiEndpoint"
            :placeholder="$t('translationSettings.inputProxyEndpoint')"
          />
        </div>

        <!-- API Key -->
        <div class="space-y-2">
          <Label>{{ $t('translationSettings.apiKey') }}</Label>
          <div class="relative">
            <Input
              :type="showPassword ? 'text' : 'password'"
              v-model="formData.config.apiKey"
              :placeholder="$t('translationSettings.inputApiKey')"
              class="pr-10"
            />
            <Button
              @click="showPassword = !showPassword"
              type="button"
              variant="ghost"
              size="sm"
              class="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            >
              <Eye v-if="!showPassword" class="h-4 w-4 text-muted-foreground" />
              <EyeOff v-else class="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>

        <!-- 模型名称 -->
        <div class="space-y-2">
          <Label>{{ $t('translationSettings.modelName') }}</Label>
          <Input
            v-model="formData.config.model"
            :placeholder="$t('translationSettings.inputModelName')"
          />
        </div>

        <!-- Temperature -->
        <div class="space-y-2">
          <Label>
            {{
              $t('translationSettings.temperatureParam', {
                value: formData.config.temperature,
              })
            }}
          </Label>
          <Slider
            :model-value="[formData.config.temperature]"
            @update:model-value="
              (vals) => (formData.config.temperature = vals?.[0] || 0)
            "
            :min="0"
            :max="2"
            :step="0.1"
          />
        </div>

        <!-- 权重 (新增) -->
        <div class="space-y-2" v-if="showAdvanced">
          <Label>
            {{ $t('translationSettings.weight', '权重') }} ({{
              formData.weight
            }})
          </Label>
          <p class="text-xs text-muted-foreground">
            用于负载均衡的权重配置 (0-100)
          </p>
          <Slider
            :model-value="[formData.weight]"
            @update:model-value="(vals) => (formData.weight = vals?.[0] || 100)"
            :min="0"
            :max="100"
            :step="1"
          />
        </div>

        <!-- 显示/隐藏高级选项 -->
        <div class="flex justify-center border-t border-border/50 pt-2">
          <Button
            variant="ghost"
            size="sm"
            @click="showAdvanced = !showAdvanced"
            class="text-xs text-muted-foreground"
          >
            {{ showAdvanced ? '收起高级选项' : '显示高级选项' }}
            <ChevronDown v-if="!showAdvanced" class="ml-1 h-3 w-3" />
            <ChevronUp v-else class="ml-1 h-3 w-3" />
          </Button>
        </div>

        <!-- 高级选项区域 -->
        <div v-show="showAdvanced" class="space-y-4 pt-2">
          <!-- Requests Per Second -->
          <div class="space-y-2">
            <Label>
              {{
                $t('translationSettings.requestsPerSecond', {
                  value:
                    formData.config.requestsPerSecond === 0
                      ? $t('translationSettings.noLimit')
                      : formData.config.requestsPerSecond +
                        ' ' +
                        $t('translationSettings.requestsPerSecondUnit'),
                })
              }}
            </Label>
            <Input
              type="number"
              v-model.number="formData.config.requestsPerSecond"
              :min="0"
              :max="100"
              :placeholder="$t('translationSettings.inputRequestsPerSecond')"
            />
          </div>

          <div class="flex items-center justify-between">
            <div class="space-y-1">
              <Label>{{ $t('translationSettings.enableThinkingMode') }}</Label>
              <p class="text-xs text-muted-foreground">
                {{ $t('translationSettings.enableThinkingModeDescription') }}
              </p>
            </div>
            <Switch v-model="formData.config.enable_thinking" />
          </div>

          <div class="flex items-center justify-between">
            <div class="space-y-1">
              <Label>
                {{ $t('translationSettings.includeThinkingParam') }}
              </Label>
            </div>
            <Switch v-model="formData.config.includeThinkingParam" />
          </div>

          <div class="flex items-center justify-between">
            <div class="space-y-1">
              <Label>
                {{ $t('translationSettings.sendRequestThroughBackground') }}
              </Label>
            </div>
            <Switch v-model="formData.config.useBackgroundProxy" />
          </div>

          <!-- 自定义参数 -->
          <div class="space-y-2">
            <Label>{{ $t('translationSettings.customApiParams') }}</Label>
            <textarea
              v-model="formData.config.customParams"
              @input="validateCustomParams"
              placeholder='{"top_p": 0.9}'
              class="w-full h-24 p-3 text-sm font-mono border rounded-md resize-none"
              :class="{ 'border-red-500': customParamsError }"
            />
            <div v-if="customParamsError" class="text-xs text-red-600">
              {{ customParamsError }}
            </div>
          </div>
        </div>

        <!-- 测试连接 -->
        <div class="border-t border-border pt-4">
          <div class="flex items-center justify-between mb-2">
            <Label class="text-sm font-medium">
              {{ $t('translationSettings.apiConnectionTest') }}
            </Label>
            <Button
              @click="testConnection"
              :disabled="isTesting || !formData.config.apiKey"
              size="sm"
            >
              <span v-if="isTesting" class="animate-spin mr-2">⏳</span>
              {{ $t('translationSettings.testConnection') }}
            </Button>
          </div>

          <div
            v-if="testResult"
            class="text-sm p-2 rounded-md"
            :class="
              testResult.success
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            "
          >
            <div class="flex items-center">
              <component
                :is="testResult.success ? CheckCircle2Icon : XCircle"
                class="h-4 w-4 mr-1"
              />
              {{ testResult.success ? '连接成功' : '连接失败' }}
            </div>
            <div v-if="testResult.message" class="mt-1 text-xs">
              {{ testResult.message }}
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter class="flex justify-end space-x-2">
        <Button @click="$emit('cancel')" variant="outline">
          {{ $t('translationSettings.cancel') }}
        </Button>
        <Button @click="handleSave" :disabled="!isFormValid">
          {{
            isEditing
              ? $t('translationSettings.save')
              : $t('translationSettings.add')
          }}
        </Button>
      </CardFooter>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { ApiConfigItem, ApiConfig } from '@/src/modules/shared/types';
import {
  testApiConnection,
  testGeminiConnection,
  ApiTestResult,
} from '@/src/utils';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  X,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  CheckCircle2 as CheckCircle2Icon,
  XCircle,
} from 'lucide-vue-next';

const props = defineProps<{
  initialConfig?: ApiConfigItem | null;
  settings?: any; // 需要传入全局设置以获取 timeout
}>();

const emit = defineEmits<{
  (
    e: 'save',
    data: { name: string; provider: string; config: ApiConfig; weight: number },
  ): void;
  (e: 'cancel'): void;
}>();

const showPassword = ref(false);
const showAdvanced = ref(false);
const isTesting = ref(false);
const testResult = ref<ApiTestResult | null>(null);
const customParamsError = ref('');

// 表单数据
const formData = ref({
  name: '',
  provider: '',
  customProviderName: '',
  weight: 100, // 默认权重
  config: {
    apiKey: '',
    apiEndpoint: '',
    model: '',
    temperature: 0.7,
    enable_thinking: false,
    includeThinkingParam: false,
    customParams: '',
    phraseEnabled: true,
    requestsPerSecond: 0,
    useBackgroundProxy: false,
  } as ApiConfig,
});

const isEditing = computed(() => !!props.initialConfig);

// 预定义配置
const providerConfigs = {
  openai: {
    name: 'OpenAI',
    apiEndpoint: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o-mini',
  },
  deepseek: {
    name: 'DeepSeek',
    apiEndpoint: 'https://api.deepseek.com/v1/chat/completions',
    defaultModel: 'deepseek-chat',
  },
  'silicon-flow': {
    name: 'Silicon Flow',
    apiEndpoint: 'https://api.siliconflow.cn/v1/chat/completions',
    defaultModel: 'qwen/Qwen2.5-7B-Instruct',
  },
  anthropic: {
    name: 'Anthropic',
    apiEndpoint: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-3-5-sonnet-20241022',
  },
  GoogleGemini: {
    name: 'Google Gemini',
    apiEndpoint: '',
    defaultModel: 'gemini-2.0-flash',
  },
  ProxyGemini: {
    name: 'Proxy-Gemini',
    apiEndpoint: 'https://api-proxy.me/gemini',
    defaultModel: 'gemini-2.0-flash',
  },
};

onMounted(() => {
  if (props.initialConfig) {
    const { name, provider, config, weight } = props.initialConfig;

    // 检查是否是预定义的服务商
    const isPredefined = Object.keys(providerConfigs).includes(provider);

    formData.value = {
      name,
      provider: isPredefined ? provider : 'custom',
      customProviderName: isPredefined ? '' : provider,
      weight: weight ?? 100,
      config: { ...config },
    };
  }
});

const handleProviderChange = (val: any) => {
  if (
    val !== 'custom' &&
    providerConfigs[val as keyof typeof providerConfigs]
  ) {
    const def = providerConfigs[val as keyof typeof providerConfigs];
    formData.value.config.apiEndpoint = def.apiEndpoint;
    formData.value.config.model = def.defaultModel;
    if (!formData.value.name) {
      formData.value.name = def.name;
    }
  }
};

const validateCustomParams = () => {
  const params = formData.value.config.customParams?.trim();
  if (!params) {
    customParamsError.value = '';
    return;
  }
  try {
    JSON.parse(params);
    customParamsError.value = '';
  } catch (e: any) {
    customParamsError.value = e.message;
  }
};

const isFormValid = computed(() => {
  return (
    formData.value.name &&
    formData.value.config.apiKey &&
    !customParamsError.value
  );
});

const handleSave = () => {
  const provider =
    formData.value.provider === 'custom'
      ? formData.value.customProviderName || 'custom'
      : formData.value.provider;

  emit('save', {
    name: formData.value.name,
    provider,
    config: formData.value.config,
    weight: formData.value.weight,
  });
};

const testConnection = async () => {
  if (!formData.value.config.apiKey) return;

  isTesting.value = true;
  testResult.value = null;

  try {
    const provider = formData.value.provider;
    if (provider === 'GoogleGemini' || provider === 'ProxyGemini') {
      testResult.value = await testGeminiConnection(formData.value.config);
    } else {
      // 构造临时 item 用于测试
      const tempItem = {
        id: 'temp',
        name: formData.value.name,
        provider,
        config: formData.value.config,
        isDefault: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        enabled: true,
      } as ApiConfigItem;

      testResult.value = await testApiConnection(
        tempItem,
        props.settings?.apiRequestTimeout || 0,
      );
    }
  } catch (e: any) {
    testResult.value = { success: false, message: e.message };
  } finally {
    isTesting.value = false;
  }
};
</script>
