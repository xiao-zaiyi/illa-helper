<template>
  <Card>
    <CardHeader class="pb-3">
      <CardTitle>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <h2 class="text-2xl font-bold text-foreground">
              {{ $t('translationSettings.manageConfig') }}
            </h2>
            <span
              class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 font-normal"
            >
              {{ enabledCount }} / {{ configs.length }}
              {{ $t('translationSettings.enabled', '启用') }}
            </span>
          </div>
          <Button @click="$emit('add')" size="sm" variant="default">
            <PlusCircle class="h-4 w-4 mr-1" />
            {{ $t('translationSettings.addConfig') }}
          </Button>
        </div>
      </CardTitle>
    </CardHeader>
    <CardContent class="pt-0">
      <div
        v-if="configs.length === 0"
        class="rounded-lg border border-dashed p-6 text-center text-muted-foreground"
      >
        <FolderOpenIcon class="h-8 w-8 mx-auto mb-2 opacity-50" />
        {{ $t('translationSettings.noConfigMessage') }}
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="config in configs"
          :key="config.id"
          class="rounded-lg border bg-card p-3 hover:shadow-sm transition-shadow relative group"
          :class="{
            'border-primary/50 text-opacity-100': config.enabled !== false,
            'border-border/50 opacity-80 bg-muted/30': config.enabled === false,
          }"
        >
          <!-- 头部：图标、名称、开关 -->
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2 min-w-0">
              <div class="p-1.5 rounded-md bg-muted/50">
                <ServerIcon
                  v-if="config.provider.includes('openai')"
                  class="h-4 w-4 text-green-600"
                />
                <CloudIcon
                  v-else-if="
                    config.provider.includes('cloud') ||
                    config.provider.includes('flow')
                  "
                  class="h-4 w-4 text-blue-600"
                />
                <GlobeIcon v-else class="h-4 w-4 text-primary" />
              </div>
              <div class="min-w-0">
                <div
                  class="font-semibold text-sm truncate flex items-center gap-1"
                >
                  {{ config.name }}
                  <span
                    v-if="config.id === activeId"
                    class="text-[10px] bg-primary/10 text-primary px-1 rounded ml-1"
                  >
                    Default
                  </span>
                </div>
                <div class="text-[10px] text-muted-foreground truncate">
                  {{ config.provider }}
                </div>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <!-- 启用开关 -->
              <Switch
                :key="`switch-${config.id}-${String(config.enabled)}`"
                :checked="
                  config.enabled === undefined || config.enabled === true
                "
                @update:checked="
                  (val: boolean) => $emit('toggle', config.id, val)
                "
                class="scale-90"
                :title="config.enabled !== false ? '点击禁用' : '点击启用'"
              />
              <!-- DEBUG: 显示 enabled 状态 -->
              <!-- <span class="text-[10px] text-red-500 hidden">{{ String(config.enabled) }}</span> -->
            </div>
          </div>

          <!-- 信息行 -->
          <div
            class="flex items-center gap-4 text-xs text-muted-foreground mb-3 px-1"
          >
            <div class="flex items-center gap-1" title="Model">
              <BoxIcon class="h-3 w-3" />
              <span class="truncate max-w-[80px]">
                {{ config.config.model }}
              </span>
            </div>
            <div class="flex items-center gap-1" title="Weight">
              <ScaleIcon class="h-3 w-3" />
              <span>{{ config.weight || 100 }}</span>
            </div>
            <div
              class="flex items-center gap-1"
              :class="config.config.apiKey ? 'text-green-600' : 'text-red-500'"
            >
              <KeyIcon class="h-3 w-3" />
              <span>{{ config.config.apiKey ? '已配置' : '未配置' }}</span>
            </div>
          </div>

          <!-- 测试结果显示 -->
          <div
            v-if="testResults[config.id]"
            class="text-xs p-2 rounded-md mb-2"
            :class="
              testResults[config.id].success
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-700'
            "
          >
            <div class="flex items-center">
              <component
                :is="
                  testResults[config.id].success ? CheckCircle2Icon : XCircle
                "
                class="h-3 w-3 mr-1"
              />
              {{
                testResults[config.id].success
                  ? $t('translationSettings.connectionSuccess')
                  : $t('translationSettings.connectionFailed')
              }}
            </div>
          </div>

          <!-- 操作栏 -->
          <div
            class="flex items-center justify-between pt-2 border-t border-border/40"
          >
            <Button
              @click="testConfig(config)"
              size="sm"
              variant="ghost"
              class="h-6 text-xs px-2 gap-1"
              :disabled="testingState[config.id]"
            >
              <Loader2Icon
                v-if="testingState[config.id]"
                class="h-3 w-3 animate-spin"
              />
              <ZapIcon v-else class="h-3 w-3" />
              {{ $t('translationSettings.test') }}
            </Button>

            <div class="flex items-center gap-1">
              <Button
                v-if="config.id !== activeId"
                @click="$emit('set-active', config.id)"
                size="sm"
                variant="ghost"
                class="h-6 text-xs px-2 text-muted-foreground hover:text-primary"
                title="设为默认 (Set as Default)"
              >
                Set Default
              </Button>
              <div
                class="w-px h-3 bg-border/50"
                v-if="config.id !== activeId"
              ></div>
              <Button
                @click="$emit('edit', config)"
                size="sm"
                variant="ghost"
                class="h-6 w-6 p-0 hover:bg-muted"
              >
                <PencilIcon class="h-3 w-3" />
              </Button>
              <Button
                @click="$emit('delete', config.id)"
                size="sm"
                variant="ghost"
                class="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
              >
                <Trash2Icon class="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { ApiConfigItem } from '@/src/modules/shared/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  PlusCircle,
  FolderOpen as FolderOpenIcon,
  Server as ServerIcon,
  Cloud as CloudIcon,
  Globe as GlobeIcon,
  Box as BoxIcon,
  Scale as ScaleIcon,
  Key as KeyIcon,
  Zap as ZapIcon,
  Loader2 as Loader2Icon,
  Pencil as PencilIcon,
  Trash2 as Trash2Icon,
  CheckCircle2 as CheckCircle2Icon,
  XCircle,
} from 'lucide-vue-next';
import {
  testApiConnection,
  testGeminiConnection,
  ApiTestResult,
} from '@/src/utils';

const props = defineProps<{
  configs: ApiConfigItem[];
  activeId: string;
  settings?: any;
}>();

defineEmits<{
  (e: 'add'): void;
  (e: 'edit', config: ApiConfigItem): void;
  (e: 'delete', id: string): void;
  (e: 'toggle', id: string, enabled: boolean): void;
  (e: 'set-active', id: string): void;
}>();

const enabledCount = computed(
  () => props.configs.filter((c) => c.enabled !== false).length,
);

// 测试状态管理
const testingState = ref<Record<string, boolean>>({});
const testResults = ref<Record<string, ApiTestResult>>({});

const testConfig = async (config: ApiConfigItem) => {
  if (!config.config.apiKey) return;

  const id = config.id;
  testingState.value[id] = true;
  delete testResults.value[id];

  try {
    let result: ApiTestResult;
    if (
      config.provider === 'GoogleGemini' ||
      config.provider === 'ProxyGemini'
    ) {
      result = await testGeminiConnection(config.config);
    } else {
      result = await testApiConnection(
        config,
        props.settings?.apiRequestTimeout || 0,
      );
    }

    testResults.value[id] = result;

    // 5秒后清除结果
    setTimeout(() => {
      delete testResults.value[id];
    }, 5000);
  } catch (e: any) {
    testResults.value[id] = { success: false, message: e.message };
  } finally {
    testingState.value[id] = false;
  }
};
</script>
