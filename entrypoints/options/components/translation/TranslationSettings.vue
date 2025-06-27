<template>
  <div class="space-y-6">

    <!-- 当前配置选择 -->
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 class="text-2xl font-bold text-foreground">翻译服务配置</h2>
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <!-- API超时时间配置 -->
        <div class="bg-muted/50 rounded-lg p-4 border border-border/50">
          <div class="flex items-center gap-2 mb-3">
            <div class="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <svg class="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-foreground">API请求设置</h3>
          </div>

          <div class="space-y-3">
            <div class="space-y-2">
              <Label for="api-timeout" class="text-sm font-medium flex items-center gap-2">
                超时时间（秒）
                <span
                  class="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  全局设置
                </span>
              </Label>
              <p class="text-xs text-muted-foreground leading-relaxed">
                设置所有API请求的最大等待时间。填写 <code class="px-1 py-0.5 bg-muted rounded text-xs">0</code> 表示不做任何超时限制。
              </p>
              <div class="relative">
                <Input id="api-timeout" type="number" :model-value="Math.round(settings.apiRequestTimeout / 1000)"
                  @update:model-value="settings.apiRequestTimeout = Number($event || 0) * 1000"
                  placeholder="输入超时时间（秒），0表示无限制" min="0" class="pr-12" />
                <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span class="text-sm text-muted-foreground">秒</span>
                </div>
              </div>

              <!-- 快速设置选项 -->
              <div class="flex flex-wrap gap-2 mt-2">
                <button v-for="preset in [10, 30, 60, 120, 0]" :key="preset"
                  @click="settings.apiRequestTimeout = preset * 1000" type="button"
                  class="inline-flex items-center rounded-md bg-background border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                  :class="{ 'bg-primary/10 border-primary/20 text-primary': Math.round(settings.apiRequestTimeout / 1000) === preset }">
                  {{ preset === 0 ? '无限制' : `${preset}秒` }}
                </button>
              </div>
            </div>
          </div>
        </div>


        <div class="space-y-2">
          <Label>当前活跃配置</Label>
          <Select v-model="settings.activeApiConfigId" @update:model-value="handleActiveConfigChange">
            <SelectTrigger>
              <SelectValue placeholder="选择API配置" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="config in settings.apiConfigs" :key="config.id" :value="config.id">
                {{ config.name }} ({{ config.provider }})
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- 当前配置状态 -->
        <div v-if="activeConfig" class="p-3 bg-muted rounded-lg">
          <div class="text-sm space-y-1">
            <div>
              <strong>服务商：</strong>
              {{ activeConfig.provider }}
            </div>
            <div>
              <strong>模型：</strong>
              {{ activeConfig.config.model }}
            </div>
            <div class="truncate">
              <strong>端点：</strong>
              {{ activeConfig.config.apiEndpoint }}
            </div>
            <div>
              <strong>状态：</strong>
              <span :class="activeConfig.config.apiKey
                ? 'text-green-600'
                : 'text-destructive'
                ">
                {{ activeConfig.config.apiKey ? '已配置' : '未配置API密钥' }}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- 配置管理 -->
    <Card>
      <CardHeader class="pb-3">
        <CardTitle>
          <div class="flex items-center justify-between">
            <h2 class="text-2xl font-bold text-foreground">管理配置</h2>
            <Button @click="showAddDialog = true" size="sm" variant="default">
              <PlusCircle class="h-4 w-4 mr-1" />
              添加配置
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent class="pt-0">
        <RadioGroup :model-value="settings.activeApiConfigId" @update:model-value="
          (value) => {
            settings.activeApiConfigId = value;
            handleActiveConfigChange();
          }
        ">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-for="config in settings.apiConfigs" :key="config.id"
              class="rounded-lg border bg-card p-3 hover:shadow-sm transition-shadow" :class="{
                'border-primary border-2':
                  config.id === settings.activeApiConfigId,
              }">
              <div class="flex items-center justify-between mb-1.5">
                <div class="flex items-center gap-1.5 min-w-0">
                  <ServerIcon v-if="config.provider.toLowerCase().includes('openai')"
                    class="h-3.5 w-3.5 text-green-500" />
                  <CloudIcon v-else-if="config.provider.toLowerCase().includes('cloud')"
                    class="h-3.5 w-3.5 text-blue-500" />
                  <GlobeIcon v-else class="h-3.5 w-3.5 text-primary" />
                  <h3 class="font-semibold text-sm truncate" :title="config.name">
                    {{ config.name }}
                  </h3>
                </div>
                <div class="flex items-center">
                  <RadioGroupItem :value="config.id" :id="`config-${config.id}`" />
                  <label :for="`config-${config.id}`" class="text-xs ml-1.5 text-muted-foreground cursor-pointer">
                    激活
                  </label>
                </div>
              </div>

              <div class="text-xs text-muted-foreground space-y-0.5 mb-2">
                <div class="flex items-center gap-1">
                  <HashIcon class="h-3 w-3" />
                  <span class="truncate" :title="config.provider">
                    {{ config.provider }}
                  </span>
                </div>
                <div class="flex items-center gap-1">
                  <CodeIcon class="h-3 w-3" />
                  <span class="truncate" :title="config.config.model">
                    {{ config.config.model }}
                  </span>
                </div>
                <div class="flex items-center gap-1">
                  <KeyIcon class="h-3 w-3" />
                  <span class="flex items-center">
                    <span class="inline-block w-1.5 h-1.5 rounded-full mr-1" :class="config.config.apiKey ? 'bg-green-500' : 'bg-red-500'
                      "></span>
                    {{ config.config.apiKey ? '已配置' : '未配置' }}
                  </span>
                </div>
              </div>

              <!-- 测试结果显示 -->
              <div v-if="cardTestResults[config.id]" class="text-xs p-2 rounded-md mb-2" :class="{
                'bg-green-50 text-green-700 border border-green-200':
                  cardTestResults[config.id].success,
                'bg-red-50 text-red-700 border border-red-200':
                  !cardTestResults[config.id].success,
              }">
                <div class="flex items-center">
                  <CheckCircle2Icon v-if="cardTestResults[config.id].success" class="h-3 w-3 mr-1" />
                  <XCircle v-else class="h-3 w-3 mr-1" />
                  <span class="font-medium">
                    {{
                      cardTestResults[config.id].success
                        ? '连接成功'
                        : '连接失败'
                    }}
                  </span>
                </div>
                <div v-if="cardTestResults[config.id].message" class="mt-1 truncate"
                  :title="cardTestResults[config.id].message">
                  {{ cardTestResults[config.id].message }}
                </div>
              </div>

              <div class="flex items-center justify-between pt-1 border-t border-border/40">
                <div class="flex items-center gap-1">
                  <Button @click="testCardApiConnection(config)" :disabled="cardTestingStates[config.id] || !config.config.apiKey
                    " size="sm" variant="ghost" class="h-6 text-xs px-2">
                    <span v-if="cardTestingStates[config.id]" class="flex items-center">
                      <div class="animate-spin rounded-full h-2 w-2 border-b border-current mr-1"></div>
                      测试中
                    </span>
                    <span v-else class="flex items-center">
                      <ZapIcon class="h-3 w-3 mr-1" />
                      测试
                    </span>
                  </Button>
                </div>
                <div class="flex items-center gap-1">
                  <Button @click="editConfig(config)" size="sm" variant="ghost" class="h-6 w-6 p-0">
                    <PencilIcon class="h-3 w-3" />
                  </Button>
                  <Button v-if="!config.isDefault" @click="deleteConfig(config.id)" size="sm" variant="ghost"
                    class="h-6 w-6 p-0 text-destructive hover:bg-destructive/10">
                    <Trash2Icon class="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            <!-- 空状态 -->
            <div v-if="settings.apiConfigs.length === 0"
              class="rounded-lg border border-dashed p-6 text-center text-muted-foreground col-span-full">
              <FolderOpenIcon class="h-8 w-8 mx-auto mb-2 opacity-50" />
              暂无配置，点击上方"添加配置"按钮创建
            </div>
          </div>
        </RadioGroup>
      </CardContent>
    </Card>

    <!-- 配置对话框 -->
    <div v-if="showAddDialog || editingConfig" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card class="w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto" @click.stop @mousedown.stop>
        <CardHeader>
          <div class="flex items-center justify-between">
            <CardTitle>
              {{ editingConfig ? '编辑配置' : '添加新配置' }}
            </CardTitle>
            <Button @click="cancelEdit" variant="ghost" size="sm" class="h-8 w-8 p-0">
              <X class="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-2">
            <Label>配置名称</Label>
            <Input v-model="configForm.name" placeholder="输入配置名称" />
          </div>

          <div class="space-y-2">
            <Label>服务提供商</Label>
            <Select v-model="configForm.provider" @update:model-value="handleProviderChange">
              <SelectTrigger>
                <SelectValue placeholder="选择服务提供商" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="deepseek">DeepSeek</SelectItem>
                <SelectItem value="silicon-flow">Silicon Flow</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="custom">自定义</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <!-- 自定义服务商名称输入 -->
          <div v-if="configForm.provider === 'custom'" class="space-y-2">
            <Label>自定义服务商名称</Label>
            <Input v-model="configForm.customProviderName" placeholder="输入自定义服务商名称" />
          </div>

          <div class="space-y-2">
            <Label>API端点</Label>
            <Input v-model="configForm.config.apiEndpoint" placeholder="https:/xxxxx/v1/chat/completions" />
          </div>

          <div class="space-y-2">
            <Label>API密钥</Label>
            <div class="relative">
              <Input :type="showPassword ? 'text' : 'password'" v-model="configForm.config.apiKey" placeholder="输入API密钥"
                class="pr-10" />
              <Button @click="showPassword = !showPassword" type="button" variant="ghost" size="sm"
                class="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent">
                <Eye v-if="!showPassword" class="h-4 w-4 text-muted-foreground" />
                <EyeOff v-else class="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </div>

          <div class="space-y-2">
            <Label>模型名称</Label>
            <Input v-model="configForm.config.model" placeholder="gpt-4o-mini" />
          </div>

          <div class="space-y-2">
            <Label>温度参数 ({{ configForm.config.temperature }})</Label>
            <Slider :model-value="[configForm.config.temperature]" @update:model-value="updateTemperature" :min="0"
              :max="2" :step="0.1" />
          </div>

          <div class="space-y-2">
            <Label>
              每秒请求限制 ({{
                configForm.config.requestsPerSecond === 0
                  ? '无限制'
                  : configForm.config.requestsPerSecond + ' 次/秒'
              }})
            </Label>
            <p class="text-xs text-muted-foreground">
              设置每秒最大API请求数，0表示无限制。建议设置适当限制避免触发API
              429错误。
            </p>
            <Input type="number" v-model.number="configForm.config.requestsPerSecond" :min="0" :max="100"
              placeholder="0 = 无限制" />
          </div>

          <div class="flex items-center justify-between">
            <div class="space-y-1">
              <Label>启用思考模式</Label>
              <p class="text-xs text-muted-foreground">
                控制是否启用AI的思考过程输出
              </p>
            </div>
            <Switch v-model="configForm.config.enable_thinking" />
          </div>

          <div class="flex items-center justify-between">
            <div class="space-y-1">
              <Label>请求传递思考参数</Label>
              <p class="text-xs text-muted-foreground">
                控制enable_thinking参数是否向API发送思考参数（某些模型不支持此参数）
              </p>
            </div>
            <Switch v-model="configForm.config.includeThinkingParam" />
          </div>

          <div class="flex items-center justify-between">
            <div class="space-y-1">
              <Label>通过扩展后台发送请求</Label>
              <p class="text-xs text-muted-foreground">
                启用此选项可绕过CORS限制，适用于无法访问的API服务。如果遇到跨域错误，建议启用此选项
              </p>
            </div>
            <Switch v-model="configForm.config.useBackgroundProxy" />
          </div>

          <!-- 自定义API参数 -->
          <div class="space-y-3">
            <div class="space-y-1">
              <Label>自定义API参数</Label>
              <p class="text-xs text-muted-foreground">
                支持添加额外的API参数，如top_p、presence_penalty等（JSON格式）
              </p>
            </div>

            <div class="space-y-2">
              <div class="relative">
                <textarea v-model="configForm.config.customParams" @input="validateCustomParams"
                  placeholder='{"top_p": 0.9, "presence_penalty": 0.1, "max_tokens": 1000}'
                  class="w-full h-32 p-3 text-sm font-mono border rounded-md resize-none" :class="{
                    'border-red-500 focus:border-red-500': customParamsError,
                    'border-green-500 focus:border-green-500':
                      customParamsValid &&
                      configForm.config.customParams?.trim(),
                  }" />
              </div>

              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                  <Button @click="formatCustomParams" size="sm" variant="outline"
                    :disabled="!configForm.config.customParams?.trim()">
                    格式化JSON
                  </Button>
                  <Button @click="clearCustomParams" size="sm" variant="outline"
                    :disabled="!configForm.config.customParams?.trim()">
                    清空
                  </Button>
                  <Button @click="showCustomParamsExample = !showCustomParamsExample" size="sm" variant="ghost">
                    {{ showCustomParamsExample ? '隐藏示例' : '显示示例' }}
                  </Button>
                </div>

                <div v-if="configForm.config.customParams?.trim()" class="flex items-center space-x-1">
                  <div v-if="customParamsValid" class="flex items-center text-green-600 text-xs">
                    <CheckCircle2Icon class="h-3 w-3 mr-1" />
                    JSON格式正确
                  </div>
                  <div v-else-if="customParamsError" class="flex items-center text-red-600 text-xs">
                    <XCircle class="h-3 w-3 mr-1" />
                    JSON格式错误
                  </div>
                </div>
              </div>

              <!-- 错误信息 -->
              <div v-if="customParamsError" class="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                {{ customParamsError }}
              </div>

              <!-- 参数示例 -->
              <div v-if="showCustomParamsExample" class="text-xs bg-muted p-3 rounded border">
                <div class="font-medium mb-2">常用参数示例：</div>
                <pre class="text-muted-foreground whitespace-pre-wrap">
                  {
                    "top_p": 0.9,
                    "presence_penalty": 0.1,
                    "frequency_penalty": 0.1,
                    "max_tokens": 1000,
                    "stop": ["\n", "###"]
                  }
                </pre>
                <div class="mt-2 text-muted-foreground">
                  <strong>注意：</strong>
                  system参数如model、messages、apiKey等将被系统保护，不会被覆盖。
                </div>
              </div>
            </div>
          </div>

          <!-- API连接测试 -->
          <div class="border-t border-border pt-4">
            <div class="flex items-center justify-between mb-2">
              <Label class="text-sm font-medium">API连接测试</Label>
              <Button @click="testApiConnection" :disabled="isTestingConnection ||
                !configForm.config.apiKey ||
                !configForm.config.apiEndpoint
                " size="sm" variant="outline">
                <span v-if="isTestingConnection" class="flex items-center">
                  <div class="animate-spin rounded-full h-3 w-3 border-b-2 border-primary mr-1"></div>
                  测试中...
                </span>
                <span v-else>测试连接</span>
              </Button>
            </div>

            <!-- 测试结果显示 -->
            <div v-if="testResult" class="text-sm p-2 rounded-md" :class="{
              'bg-green-50 text-green-700 border border-green-200':
                testResult.success,
              'bg-red-50 text-red-700 border border-red-200':
                !testResult.success,
            }">
              <div class="flex items-center">
                <CheckCircle2Icon v-if="testResult.success" class="h-4 w-4 mr-1" />
                <XCircle v-else class="h-4 w-4 mr-1" />
                <span class="font-medium">
                  {{ testResult.success ? 'API连接成功' : 'API连接失败' }}
                </span>
              </div>
              <div v-if="testResult.message" class="mt-1 text-xs">
                {{ testResult.message }}
              </div>
              <div v-if="testResult.success && testResult.model" class="mt-1 text-xs">
                检测到模型: {{ testResult.model }}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter class="flex justify-end space-x-2">
          <Button @click="cancelEdit" variant="outline">取消</Button>
          <Button @click="saveConfig">
            {{ editingConfig ? '保存' : '添加' }}
          </Button>
        </CardFooter>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted, watch } from 'vue';
import { StorageManager } from '@/src/modules/storageManager';
import {
  testApiConnection as performApiTest,
  ApiTestResult,
} from '@/src/utils';
import {
  UserSettings,
  DEFAULT_SETTINGS,
  ApiConfigItem,
  ApiConfig,
} from '@/src/modules/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  PlusCircle,
  CheckCircle2 as CheckCircle2Icon,
  Hash as HashIcon,
  Code as CodeIcon,
  Key as KeyIcon,
  Zap as ZapIcon,
  Pencil as PencilIcon,
  Trash2 as Trash2Icon,
  FolderOpen as FolderOpenIcon,
  Server as ServerIcon,
  Cloud as CloudIcon,
  Globe as GlobeIcon,
  XCircle,
  Eye,
  EyeOff,
  X,
} from 'lucide-vue-next';

const settings = ref<UserSettings>({ ...DEFAULT_SETTINGS });
const storageManager = new StorageManager();

// 对话框状态
const showAddDialog = ref(false);
const editingConfig = ref<ApiConfigItem | null>(null);

// 自定义参数状态
const customParamsError = ref<string>('');
const customParamsValid = ref<boolean>(false);
const showCustomParamsExample = ref<boolean>(false);

// 密码可见性状态
const showPassword = ref<boolean>(false);

// 预定义的服务提供商配置
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
};

// 配置表单
const configForm = ref<{
  name: string;
  provider: string;
  customProviderName?: string;
  config: ApiConfig;
}>({
  name: '',
  provider: '',
  customProviderName: '',
  config: {
    apiKey: '',
    apiEndpoint: '',
    model: '',
    temperature: 0,
    enable_thinking: false,
    includeThinkingParam: false,
    customParams: '',
    phraseEnabled: true,
    requestsPerSecond: 0,
    useBackgroundProxy: false,
  },
});

const emit = defineEmits<{
  saveMessage: [message: string];
}>();

// 计算属性
const activeConfig = computed(() => {
  return settings.value.apiConfigs.find(
    (config) => config.id === settings.value.activeApiConfigId,
  );
});

const handleActiveConfigChange = async () => {
  try {
    await storageManager.setActiveApiConfig(settings.value.activeApiConfigId);

    // 重新加载完整设置以确保同步
    await loadSettings();

    emit('saveMessage', '活跃配置已更新');
    notifyConfigChange();
  } catch (error) {
    console.error('更新活跃配置失败:', error);
  }
};

const editConfig = (config: ApiConfigItem) => {
  editingConfig.value = config;

  // 检查是否是预定义的服务商
  const predefinedProvider = Object.keys(providerConfigs).find(
    (key) =>
      providerConfigs[key as keyof typeof providerConfigs].name ===
      config.provider || key === config.provider,
  );

  configForm.value = {
    name: config.name,
    provider: predefinedProvider || 'custom',
    customProviderName: predefinedProvider ? '' : config.provider,
    config: { ...config.config },
  };

  // 加载配置后验证自定义参数
  if (configForm.value.config.customParams) {
    validateCustomParams();
  }
};

const deleteConfig = async (configId: string) => {
  if (confirm('确定要删除这个配置吗？')) {
    try {
      await storageManager.removeApiConfig(configId);
      await loadSettings();
      emit('saveMessage', '配置已删除');
      notifyConfigChange();
    } catch (error) {
      console.error('删除配置失败:', error);
      alert('删除配置失败');
    }
  }
};

const updateTemperature = (value: number[] | undefined) => {
  configForm.value.config.temperature = (value && value[0]) || 0;
};

// 自定义参数相关方法
const validateCustomParams = () => {
  const params = configForm.value.config.customParams?.trim();

  if (!params) {
    customParamsError.value = '';
    customParamsValid.value = false;
    return;
  }

  try {
    JSON.parse(params);
    customParamsError.value = '';
    customParamsValid.value = true;
  } catch (error) {
    customParamsValid.value = false;
    if (error instanceof SyntaxError) {
      customParamsError.value = `JSON格式错误: ${error.message}`;
    } else {
      customParamsError.value = 'JSON解析失败';
    }
  }
};

const formatCustomParams = () => {
  const params = configForm.value.config.customParams?.trim();
  if (!params) return;

  try {
    const parsed = JSON.parse(params);
    configForm.value.config.customParams = JSON.stringify(parsed, null, 2);
    validateCustomParams();
  } catch (_) {
    // 格式化失败时不做任何操作，保持原有内容
  }
};

const clearCustomParams = () => {
  configForm.value.config.customParams = '';
  customParamsError.value = '';
  customParamsValid.value = false;
};

const handleProviderChange = (provider: any) => {
  const providerValue = provider as string;
  if (
    providerValue &&
    providerValue !== 'custom' &&
    providerConfigs[providerValue as keyof typeof providerConfigs]
  ) {
    const config =
      providerConfigs[providerValue as keyof typeof providerConfigs];
    configForm.value.config.apiEndpoint = config.apiEndpoint;
    // 如果配置名称为空，自动设置为服务商名称
    if (!configForm.value.name) {
      configForm.value.name = config.name;
    }
  }
};

const saveConfig = async () => {
  if (!configForm.value.name || !configForm.value.config.apiKey) {
    alert('请填写配置名称和API密钥');
    return;
  }

  try {
    // 确定最终的provider值
    const finalProvider =
      configForm.value.provider === 'custom'
        ? configForm.value.customProviderName || 'custom'
        : configForm.value.provider;

    if (editingConfig.value) {
      await storageManager.updateApiConfig(
        editingConfig.value.id,
        configForm.value.name,
        finalProvider,
        configForm.value.config,
      );
      emit('saveMessage', '配置已更新');
    } else {
      await storageManager.addApiConfig(
        configForm.value.name,
        finalProvider,
        configForm.value.config,
      );
      emit('saveMessage', '配置已添加');
    }

    await loadSettings();
    cancelEdit();
    notifyConfigChange();
  } catch (error) {
    console.error('保存配置失败:', error);
    alert('保存配置失败');
  }
};

// 测试连接状态
const isTestingConnection = ref(false);
const testResult = ref<ApiTestResult | null>(null);

// 卡片测试状态
const cardTestingStates = ref<Record<string, boolean>>({});
const cardTestResults = ref<Record<string, ApiTestResult>>({});

// 卡片测试结果定时器
const cardTestTimers = ref<Record<string, NodeJS.Timeout>>({});

// 测试配置对话框中的API连接
const testApiConnection = async () => {
  if (!configForm.value.config.apiKey || !configForm.value.config.apiEndpoint) {
    return;
  }

  isTestingConnection.value = true;
  testResult.value = null;

  try {
    testResult.value = await performApiTest(configForm.value.config, settings.value.apiRequestTimeout);
  } finally {
    isTestingConnection.value = false;
  }
};

// 测试卡片配置的API连接
const testCardApiConnection = async (config: ApiConfigItem) => {
  if (!config.config.apiKey || !config.config.apiEndpoint) {
    return;
  }

  // 清除之前的定时器
  if (cardTestTimers.value[config.id]) {
    clearTimeout(cardTestTimers.value[config.id]);
    delete cardTestTimers.value[config.id];
  }

  cardTestingStates.value[config.id] = true;
  delete cardTestResults.value[config.id];

  try {
    cardTestResults.value[config.id] = await performApiTest(config.config, settings.value.apiRequestTimeout);

    // 设置5秒后自动清除结果
    cardTestTimers.value[config.id] = setTimeout(() => {
      delete cardTestResults.value[config.id];
      delete cardTestTimers.value[config.id];
    }, 5000);
  } finally {
    cardTestingStates.value[config.id] = false;
  }
};

const cancelEdit = () => {
  showAddDialog.value = false;
  editingConfig.value = null;
  isTestingConnection.value = false;
  testResult.value = null;

  // 重置密码可见性状态
  showPassword.value = false;

  // 重置自定义参数状态
  customParamsError.value = '';
  customParamsValid.value = false;
  showCustomParamsExample.value = false;

  configForm.value = {
    name: '',
    provider: '',
    customProviderName: '',
    config: {
      apiKey: '',
      apiEndpoint: '',
      model: '',
      temperature: 0,
      enable_thinking: false,
      includeThinkingParam: false,
      customParams: '',
      phraseEnabled: true,
      requestsPerSecond: 0,
    },
  };
};

const loadSettings = async () => {
  try {
    settings.value = await storageManager.getUserSettings();
  } catch (error) {
    console.error('加载设置失败:', error);
  }
};

const notifyConfigChange = () => {
  try {
    browser.runtime.sendMessage({
      type: 'settings_updated',
      settings: settings.value,
    });
  } catch (error) {
    console.error('通知配置更改失败:', error);
  }
};

// 清理所有定时器
const clearAllTestTimers = () => {
  Object.values(cardTestTimers.value).forEach((timer) => {
    clearTimeout(timer);
  });
  cardTestTimers.value = {};
};

onMounted(async () => {
  await loadSettings();
});

// 监听settings变化，实现实时保存
watch(
  settings,
  async (newSettings) => {
    try {
      await storageManager.saveUserSettings(newSettings);
      emit('saveMessage', '设置已保存');
      notifyConfigChange();
    } catch (error) {
      console.error('保存设置失败:', error);
      emit('saveMessage', '保存设置失败');
    }
  },
  { deep: true }
);

// 组件卸载时清理定时器
onUnmounted(() => {
  clearAllTestTimers();
});
</script>
