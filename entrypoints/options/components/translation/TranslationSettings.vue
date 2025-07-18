<template>
  <div class="space-y-6">
    <!-- 当前配置选择 -->
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 class="text-2xl font-bold text-foreground">
            {{ $t('translationSettings.title') }}
          </h2>
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <!-- API超时时间配置 -->
        <div class="bg-muted/50 rounded-lg p-4 border border-border/50">
          <div class="flex items-center gap-2 mb-3">
            <div
              class="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center"
            >
              <svg
                class="h-4 w-4 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-foreground">
              {{ $t('translationSettings.apiRequestSettings') }}
            </h3>
          </div>

          <div class="space-y-3">
            <div class="space-y-2">
              <Label
                for="api-timeout"
                class="text-sm font-medium flex items-center gap-2"
              >
                {{ $t('translationSettings.timeoutSeconds') }}
                <span
                  class="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                >
                  {{ $t('translationSettings.globalSetting') }}
                </span>
              </Label>
              <p class="text-xs text-muted-foreground leading-relaxed">
                {{ $t('translationSettings.timeoutDescription') }}
                <code class="px-1 py-0.5 bg-muted rounded text-xs">0</code>
                {{ $t('translationSettings.noTimeoutLimit') }}
              </p>
              <div class="relative">
                <Input
                  id="api-timeout"
                  type="number"
                  :model-value="(settings.apiRequestTimeout / 1000).toFixed(3)"
                  @update:model-value="
                    settings.apiRequestTimeout = Number($event || 0) * 1000
                  "
                  :placeholder="$t('translationSettings.timeoutPlaceholder')"
                  min="0"
                  step="0.001"
                  class="pr-12"
                />
                <div
                  class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none"
                >
                  <span class="text-sm text-muted-foreground">
                    {{ $t('translationSettings.seconds') }}
                  </span>
                </div>
              </div>

              <!-- 快速设置选项 -->
              <div class="flex flex-wrap gap-2 mt-2">
                <button
                  v-for="preset in [10, 30, 60, 120, 0]"
                  :key="preset"
                  @click="settings.apiRequestTimeout = preset * 1000"
                  type="button"
                  class="inline-flex items-center rounded-md bg-background border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                  :class="{
                    'bg-primary/10 border-primary/20 text-primary':
                      settings.apiRequestTimeout / 1000 === preset,
                  }"
                >
                  {{
                    preset === 0
                      ? $t('translationSettings.unlimited')
                      : $t('translationSettings.secondsValue', {
                          value: preset,
                        })
                  }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-2">
          <Label>{{ $t('translationSettings.currentActiveConfig') }}</Label>
          <Select
            v-model="settings.activeApiConfigId"
            @update:model-value="handleActiveConfigChange"
          >
            <SelectTrigger>
              <SelectValue
                :placeholder="$t('translationSettings.selectApiConfig')"
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="config in settings.apiConfigs"
                :key="config.id"
                :value="config.id"
              >
                {{ config.name }} ({{ config.provider }})
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- 当前配置状态 -->
        <div v-if="activeConfig" class="p-3 bg-muted rounded-lg">
          <div class="text-sm space-y-1">
            <div>
              <strong>{{ $t('translationSettings.provider') }}：</strong>
              {{ activeConfig.provider }}
            </div>
            <div>
              <strong>{{ $t('translationSettings.model') }}：</strong>
              {{ activeConfig.config.model }}
            </div>
            <div class="truncate">
              <strong>{{ $t('translationSettings.endpoint') }}：</strong>
              {{ activeConfig.config.apiEndpoint }}
            </div>
            <div>
              <strong>{{ $t('translationSettings.status') }}：</strong>
              <span
                :class="
                  activeConfig.config.apiKey
                    ? 'text-green-600'
                    : 'text-destructive'
                "
              >
                {{
                  activeConfig.config.apiKey
                    ? $t('translationSettings.configured')
                    : $t('translationSettings.notConfigured')
                }}
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
            <h2 class="text-2xl font-bold text-foreground">
              {{ $t('translationSettings.manageConfig') }}
            </h2>
            <Button @click="showAddDialog = true" size="sm" variant="default">
              <PlusCircle class="h-4 w-4 mr-1" />
              {{ $t('translationSettings.addConfig') }}
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent class="pt-0">
        <RadioGroup
          :model-value="settings.activeApiConfigId"
          @update:model-value="
            (value) => {
              settings.activeApiConfigId = value;
              handleActiveConfigChange();
            }
          "
        >
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              v-for="config in settings.apiConfigs"
              :key="config.id"
              class="rounded-lg border bg-card p-3 hover:shadow-sm transition-shadow"
              :class="{
                'border-primary border-2':
                  config.id === settings.activeApiConfigId,
              }"
            >
              <div class="flex items-center justify-between mb-1.5">
                <div class="flex items-center gap-1.5 min-w-0">
                  <ServerIcon
                    v-if="config.provider.toLowerCase().includes('openai')"
                    class="h-3.5 w-3.5 text-green-500"
                  />
                  <CloudIcon
                    v-else-if="config.provider.toLowerCase().includes('cloud')"
                    class="h-3.5 w-3.5 text-blue-500"
                  />
                  <GlobeIcon v-else class="h-3.5 w-3.5 text-primary" />
                  <h3
                    class="font-semibold text-sm truncate"
                    :title="config.name"
                  >
                    {{ config.name }}
                  </h3>
                </div>
                <div class="flex items-center">
                  <RadioGroupItem
                    :value="config.id"
                    :id="`config-${config.id}`"
                  />
                  <label
                    :for="`config-${config.id}`"
                    class="text-xs ml-1.5 text-muted-foreground cursor-pointer"
                  >
                    {{ $t('translationSettings.activate') }}
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
                    <span
                      class="inline-block w-1.5 h-1.5 rounded-full mr-1"
                      :class="
                        config.config.apiKey ? 'bg-green-500' : 'bg-red-500'
                      "
                    ></span>
                    {{
                      config.config.apiKey
                        ? $t('translationSettings.configured')
                        : $t('translationSettings.notConfigured')
                    }}
                  </span>
                </div>
              </div>

              <!-- 测试结果显示 -->
              <div
                v-if="cardTestResults[config.id]"
                class="text-xs p-2 rounded-md mb-2"
                :class="{
                  'bg-green-50 text-green-700 border border-green-200':
                    cardTestResults[config.id].success,
                  'bg-red-50 text-red-700 border border-red-200':
                    !cardTestResults[config.id].success,
                }"
              >
                <div class="flex items-center">
                  <CheckCircle2Icon
                    v-if="cardTestResults[config.id].success"
                    class="h-3 w-3 mr-1"
                  />
                  <XCircle v-else class="h-3 w-3 mr-1" />
                  <span class="font-medium">
                    {{
                      cardTestResults[config.id].success
                        ? $t('translationSettings.connectionSuccess')
                        : $t('translationSettings.connectionFailed')
                    }}
                  </span>
                </div>
                <div
                  v-if="cardTestResults[config.id].message"
                  class="mt-1 truncate"
                  :title="cardTestResults[config.id].message"
                >
                  {{ cardTestResults[config.id].message }}
                </div>
              </div>

              <div
                class="flex items-center justify-between pt-1 border-t border-border/40"
              >
                <div class="flex items-center gap-1">
                  <Button
                    @click="testCardApiConnection(config)"
                    :disabled="
                      cardTestingStates[config.id] || !config.config.apiKey
                    "
                    size="sm"
                    variant="ghost"
                    class="h-6 text-xs px-2"
                  >
                    <span
                      v-if="cardTestingStates[config.id]"
                      class="flex items-center"
                    >
                      <div
                        class="animate-spin rounded-full h-2 w-2 border-b border-current mr-1"
                      ></div>
                      {{ $t('translationSettings.testing') }}
                    </span>
                    <span v-else class="flex items-center">
                      <ZapIcon class="h-3 w-3 mr-1" />
                      {{ $t('translationSettings.test') }}
                    </span>
                  </Button>
                </div>
                <div class="flex items-center gap-1">
                  <Button
                    @click="editConfig(config)"
                    size="sm"
                    variant="ghost"
                    class="h-6 w-6 p-0"
                  >
                    <PencilIcon class="h-3 w-3" />
                  </Button>
                  <Button
                    v-if="!config.isDefault"
                    @click="deleteConfig(config.id)"
                    size="sm"
                    variant="ghost"
                    class="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2Icon class="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            <!-- 空状态 -->
            <div
              v-if="settings.apiConfigs.length === 0"
              class="rounded-lg border border-dashed p-6 text-center text-muted-foreground col-span-full"
            >
              <FolderOpenIcon class="h-8 w-8 mx-auto mb-2 opacity-50" />
              {{ $t('translationSettings.noConfigMessage') }}
            </div>
          </div>
        </RadioGroup>
      </CardContent>
    </Card>

    <!-- 配置对话框 -->
    <div
      v-if="showAddDialog || editingConfig"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    >
      <Card
        class="w-full max-w-2xl m-4 max-h-[90vh] overflow-y-auto"
        @click.stop
        @mousedown.stop
      >
        <CardHeader>
          <div class="flex items-center justify-between">
            <CardTitle>
              {{
                editingConfig
                  ? $t('translationSettings.editConfig')
                  : $t('translationSettings.addNewConfig')
              }}
            </CardTitle>
            <Button
              @click="cancelEdit"
              variant="ghost"
              size="sm"
              class="h-8 w-8 p-0"
            >
              <X class="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-2">
            <Label>{{ $t('translationSettings.configName') }}</Label>
            <Input
              v-model="configForm.name"
              :placeholder="$t('translationSettings.inputConfigName')"
            />
          </div>

          <div class="space-y-2">
            <Label>{{ $t('translationSettings.serviceProvider') }}</Label>
            <Select
              v-model="configForm.provider"
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

          <!-- 自定义服务商名称输入 -->
          <div v-if="configForm.provider === 'custom'" class="space-y-2">
            <Label>{{ $t('translationSettings.customProviderName') }}</Label>
            <Input
              v-model="configForm.customProviderName"
              :placeholder="$t('translationSettings.inputCustomProviderName')"
            />
          </div>

          <!-- API Endpoint for OpenAI/DeepSeek/Custom -->
          <div
            v-if="
              !['GoogleGemini', 'ProxyGemini'].includes(configForm.provider)
            "
            class="space-y-2"
          >
            <Label>{{ $t('translationSettings.apiEndpoint') }}</Label>
            <Input
              v-model="configForm.config.apiEndpoint"
              :placeholder="$t('translationSettings.apiEndpointPlaceholder')"
            />
          </div>

          <!-- API Endpoint for Proxy-Gemini -->
          <div v-if="configForm.provider === 'ProxyGemini'" class="space-y-2">
            <Label>{{ $t('translationSettings.proxyApiEndpoint') }}</Label>
            <Input
              v-model="configForm.config.apiEndpoint"
              :placeholder="$t('translationSettings.inputProxyEndpoint')"
            />
          </div>

          <div class="space-y-2">
            <Label>{{ $t('translationSettings.apiKey') }}</Label>
            <div class="relative">
              <Input
                :type="showPassword ? 'text' : 'password'"
                v-model="configForm.config.apiKey"
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
                <Eye
                  v-if="!showPassword"
                  class="h-4 w-4 text-muted-foreground"
                />
                <EyeOff v-else class="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </div>

          <div class="space-y-2">
            <Label>{{ $t('translationSettings.modelName') }}</Label>
            <Input
              v-model="configForm.config.model"
              :placeholder="$t('translationSettings.inputModelName')"
            />
          </div>

          <!-- Temperature -->
          <div class="space-y-2">
            <Label>
              {{
                $t('translationSettings.temperatureParam', {
                  value: configForm.config.temperature,
                })
              }}
            </Label>
            <Slider
              :model-value="[configForm.config.temperature]"
              @update:model-value="updateTemperature"
              :min="0"
              :max="2"
              :step="0.1"
            />
          </div>

          <!-- Requests Per Second -->
          <div class="space-y-2">
            <Label>
              {{
                $t('translationSettings.requestsPerSecond', {
                  value:
                    configForm.config.requestsPerSecond === 0
                      ? $t('translationSettings.noLimit')
                      : configForm.config.requestsPerSecond +
                        ' ' +
                        $t('translationSettings.requestsPerSecondUnit'),
                })
              }}
            </Label>
            <p class="text-xs text-muted-foreground">
              {{ $t('translationSettings.requestsPerSecondDescription') }}
            </p>
            <Input
              type="number"
              v-model.number="configForm.config.requestsPerSecond"
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
            <Switch v-model="configForm.config.enable_thinking" />
          </div>

          <div class="flex items-center justify-between">
            <div class="space-y-1">
              <Label>
                {{ $t('translationSettings.includeThinkingParam') }}
              </Label>
              <p class="text-xs text-muted-foreground">
                {{ $t('translationSettings.includeThinkingParamDescription') }}
              </p>
            </div>
            <Switch v-model="configForm.config.includeThinkingParam" />
          </div>

          <div class="flex items-center justify-between">
            <div class="space-y-1">
              <Label>
                {{ $t('translationSettings.sendRequestThroughBackground') }}
              </Label>
              <p class="text-xs text-muted-foreground">
                {{
                  $t(
                    'translationSettings.sendRequestThroughBackgroundDescription',
                  )
                }}
              </p>
            </div>
            <Switch v-model="configForm.config.useBackgroundProxy" />
          </div>

          <!-- 自定义API参数 -->
          <div class="space-y-3">
            <div class="space-y-1">
              <Label>{{ $t('translationSettings.customApiParams') }}</Label>
              <p class="text-xs text-muted-foreground">
                {{ $t('translationSettings.customApiParamsDescription') }}
              </p>
            </div>

            <div class="space-y-2">
              <div class="relative">
                <textarea
                  v-model="configForm.config.customParams"
                  @input="validateCustomParams"
                  placeholder='{"top_p": 0.9, "presence_penalty": 0.1, "max_tokens": 1000}'
                  class="w-full h-32 p-3 text-sm font-mono border rounded-md resize-none"
                  :class="{
                    'border-red-500 focus:border-red-500': customParamsError,
                    'border-green-500 focus:border-green-500':
                      customParamsValid &&
                      configForm.config.customParams?.trim(),
                  }"
                />
              </div>

              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                  <Button
                    @click="formatCustomParams"
                    size="sm"
                    variant="outline"
                    :disabled="!configForm.config.customParams?.trim()"
                  >
                    {{ $t('translationSettings.formatJson') }}
                  </Button>
                  <Button
                    @click="clearCustomParams"
                    size="sm"
                    variant="destructive"
                    :disabled="!configForm.config.customParams?.trim()"
                  >
                    {{ $t('translationSettings.clear') }}
                  </Button>
                  <Button
                    @click="showCustomParamsExample = !showCustomParamsExample"
                    size="sm"
                    variant="outline"
                  >
                    {{
                      showCustomParamsExample
                        ? $t('translationSettings.hideExample')
                        : $t('translationSettings.showExample')
                    }}
                  </Button>
                </div>

                <div
                  v-if="configForm.config.customParams?.trim()"
                  class="flex items-center space-x-1"
                >
                  <div
                    v-if="customParamsValid"
                    class="flex items-center text-green-600 text-xs"
                  >
                    <CheckCircle2Icon class="h-3 w-3 mr-1" />
                    {{ $t('translationSettings.jsonValid') }}
                  </div>
                  <div
                    v-else-if="customParamsError"
                    class="flex items-center text-red-600 text-xs"
                  >
                    <XCircle class="h-3 w-3 mr-1" />
                    {{ $t('translationSettings.jsonInvalid') }}
                  </div>
                </div>
              </div>

              <!-- 错误信息 -->
              <div
                v-if="customParamsError"
                class="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200"
              >
                {{ customParamsError }}
              </div>

              <!-- 参数示例 -->
              <div
                v-if="showCustomParamsExample"
                class="text-xs bg-muted p-3 rounded border"
              >
                <div class="font-medium mb-2">
                  {{ $t('translationSettings.commonParamsExample') }}
                </div>
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
                  <strong>{{ $t('translationSettings.note') }}</strong>
                  {{ $t('translationSettings.systemParamsNote') }}
                </div>
              </div>
            </div>
          </div>

          <!-- API连接测试 -->
          <div class="border-t border-border pt-4">
            <div class="flex items-center justify-between mb-2">
              <Label class="text-sm font-medium">
                {{ $t('translationSettings.apiConnectionTest') }}
              </Label>
              <Button
                @click="testApiConnection"
                :disabled="
                  isTestingConnection ||
                  !configForm.config.apiKey ||
                  (configForm.provider !== 'GoogleGemini' &&
                    !configForm.config.apiEndpoint)
                "
                size="sm"
                variant="default"
              >
                <span v-if="isTestingConnection" class="flex items-center">
                  <div
                    class="animate-spin rounded-full h-3 w-3 border-b-2 border-primary mr-1"
                  ></div>
                  {{ $t('translationSettings.testing') }}...
                </span>
                <span v-else>
                  {{ $t('translationSettings.testConnection') }}
                </span>
              </Button>
            </div>

            <!-- 测试结果显示 -->
            <div
              v-if="testResult"
              class="text-sm p-2 rounded-md"
              :class="{
                'bg-green-50 text-green-700 border border-green-200':
                  testResult.success,
                'bg-red-50 text-red-700 border border-red-200':
                  !testResult.success,
              }"
            >
              <div class="flex items-center">
                <CheckCircle2Icon
                  v-if="testResult.success"
                  class="h-4 w-4 mr-1"
                />
                <XCircle v-else class="h-4 w-4 mr-1" />
                <span class="font-medium">
                  {{
                    testResult.success
                      ? $t('translationSettings.apiConnectionSuccess')
                      : $t('translationSettings.apiConnectionFailed')
                  }}
                </span>
              </div>
              <div v-if="testResult.message" class="mt-1 text-xs">
                {{ testResult.message }}
              </div>
              <div
                v-if="testResult.success && testResult.model"
                class="mt-1 text-xs"
              >
                {{ $t('translationSettings.detectedModel') }}:
                {{ testResult.model }}
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter class="flex justify-end space-x-2">
          <Button @click="cancelEdit" variant="outline">
            {{ $t('translationSettings.cancel') }}
          </Button>
          <Button @click="saveConfig">
            {{
              editingConfig
                ? $t('translationSettings.save')
                : $t('translationSettings.add')
            }}
          </Button>
        </CardFooter>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { StorageService } from '@/src/modules/core/storage';
import {
  testApiConnection as performApiTest,
  testGeminiConnection,
  ApiTestResult,
} from '@/src/utils';
import {
  UserSettings,
  DEFAULT_SETTINGS,
  ApiConfigItem,
  ApiConfig,
} from '@/src/modules/shared/types';
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

const { t } = useI18n();

const settings = ref<UserSettings>({ ...DEFAULT_SETTINGS });
const storageService = StorageService.getInstance();

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
  GoogleGemini: {
    name: 'Google Gemini',
    apiEndpoint: '', // Not needed for native SDK
    defaultModel: 'gemini-2.5-flash-lite-preview-06-17',
  },
  ProxyGemini: {
    name: 'Proxy-Gemini',
    apiEndpoint: 'https://api-proxy.me/gemini', // User-provided
    defaultModel: 'gemini-2.5-flash-lite-preview-06-17',
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
    await storageService.setActiveApiConfig(settings.value.activeApiConfigId);

    // 重新加载完整设置以确保同步
    await loadSettings();

    emit('saveMessage', '活跃配置已更新');
    notifyConfigChange();
  } catch (error) {
    console.error(t('errors.updateActiveConfigFailed'), error);
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
      await storageService.removeApiConfig(configId);
      await loadSettings();
      emit('saveMessage', '配置已删除');
      notifyConfigChange();
    } catch (error) {
      console.error(t('errors.deleteConfigFailed'), error);
      alert(t('translationSettings.errors.deleteConfigFailed'));
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
    configForm.value.config.model = config.defaultModel;
    // 如果配置名称为空，自动设置为服务商名称
    if (!configForm.value.name) {
      configForm.value.name = config.name;
    }
  }
};

const saveConfig = async () => {
  if (!configForm.value.name || !configForm.value.config.apiKey) {
    alert(t('translationSettings.errors.fillRequiredFields'));
    return;
  }

  try {
    // 确定最终的provider值
    const finalProvider =
      configForm.value.provider === 'custom'
        ? configForm.value.customProviderName || 'custom'
        : configForm.value.provider;

    if (editingConfig.value) {
      await storageService.updateApiConfig(
        editingConfig.value.id,
        configForm.value.name,
        finalProvider,
        configForm.value.config,
      );
      emit('saveMessage', '配置已更新');
    } else {
      await storageService.addApiConfig(
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
    console.error(t('errors.saveConfigFailed'), error);
    alert(t('translationSettings.errors.saveConfigFailed'));
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
  const provider = configForm.value.provider;
  const config = configForm.value.config;

  if (!config.apiKey) return;
  if (provider !== 'GoogleGemini' && !config.apiEndpoint) return;

  isTestingConnection.value = true;
  testResult.value = null;
  // 获取ApiConfigItem
  const apiConfigItem = {
    id: 'temp',
    name: configForm.value.name,
    provider: configForm.value.provider,
    config: config,
    isDefault: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  } as ApiConfigItem;
  try {
    if (provider === 'GoogleGemini' || provider === 'ProxyGemini') {
      testResult.value = await testGeminiConnection(config);
    } else {
      testResult.value = await performApiTest(
        apiConfigItem,
        settings.value.apiRequestTimeout,
      );
    }
  } finally {
    isTestingConnection.value = false;
  }
};

// 测试卡片配置的API连接
const testCardApiConnection = async (configItem: ApiConfigItem) => {
  const { provider, config, id } = configItem;

  if (!config.apiKey) return;
  if (provider !== 'GoogleGemini' && !config.apiEndpoint) return;

  // 清除之前的定时器
  if (cardTestTimers.value[id]) {
    clearTimeout(cardTestTimers.value[id]);
    delete cardTestTimers.value[id];
  }

  cardTestingStates.value[id] = true;
  delete cardTestResults.value[id];

  try {
    if (provider === 'GoogleGemini' || provider === 'ProxyGemini') {
      cardTestResults.value[id] = await testGeminiConnection(config);
    } else {
      cardTestResults.value[id] = await performApiTest(
        configItem,
        settings.value.apiRequestTimeout,
      );
    }

    // 设置5秒后自动清除结果
    cardTestTimers.value[id] = setTimeout(() => {
      delete cardTestResults.value[id];
      delete cardTestTimers.value[id];
    }, 5000);
  } finally {
    cardTestingStates.value[id] = false;
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
      useBackgroundProxy: false,
    },
  };
};

const loadSettings = async () => {
  try {
    settings.value = await storageService.getUserSettings();
  } catch (error) {
    console.error(t('errors.loadSettingsFailed'), error);
  }
};

const notifyConfigChange = () => {
  try {
    browser.runtime.sendMessage({
      type: 'settings_updated',
      settings: settings.value,
    });
  } catch (error) {
    console.error(t('errors.notifyConfigChangeFailed'), error);
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
      await storageService.saveUserSettings(newSettings);
      emit('saveMessage', '设置已保存');
      notifyConfigChange();
    } catch (error) {
      console.error(t('errors.saveSettingsFailed'), error);
      emit('saveMessage', '保存设置失败');
    }
  },
  { deep: true },
);

// 组件卸载时清理定时器
onUnmounted(() => {
  clearAllTestTimers();
});
</script>
