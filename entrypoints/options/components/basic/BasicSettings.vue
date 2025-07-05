<template>
  <div class="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 class="text-2xl font-bold text-foreground">基本设置</h2>
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="flex items-center justify-between">
          <div class="space-y-1">
            <Label for="extension-enabled">启用扩展总开关</Label>
            <p class="text-xs text-muted-foreground">
              关闭后，所有翻译功能将停止工作。
            </p>
          </div>
          <Switch
            id="extension-enabled"
            :model-value="settings.isEnabled"
            @update:model-value="settings.isEnabled = $event"
          />
        </div>

        <div
          class="flex items-center justify-between border-t border-border pt-6"
        >
          <Label for="show-parentheses">翻译是否显示括号</Label>
          <Switch
            id="show-parentheses"
            :model-value="settings.showParentheses"
            @update:model-value="settings.showParentheses = $event"
          />
        </div>
        <div class="border-t border-border pt-6">
          <Label class="text-sm mb-2">翻译位置</Label>
          <RadioGroup
            :model-value="settings.translationPosition"
            @update:model-value="
              settings.translationPosition = $event as TranslationPosition
            "
            class="mt-2 flex items-center space-x-4"
          >
            <div class="flex items-center space-x-2">
              <RadioGroupItem id="pos-after" value="after" />
              <Label for="pos-after">词后</Label>
            </div>
            <div class="flex items-center space-x-2">
              <RadioGroupItem id="pos-before" value="before" />
              <Label for="pos-before">词前</Label>
            </div>
          </RadioGroup>
        </div>

        <div>
          <Label
            for="translation-style"
            class="mb-3 border-t border-border pt-6"
          >
            翻译样式
          </Label>
          <div class="flex space-x-4">
            <Select
              :model-value="settings.translationStyle"
              @update:model-value="
                settings.translationStyle = $event as TranslationStyle
              "
            >
              <SelectTrigger>
                <SelectValue placeholder="选择样式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">默认</SelectItem>
                <SelectItem value="subtle">微妙</SelectItem>
                <SelectItem value="bold">粗体</SelectItem>
                <SelectItem value="italic">斜体</SelectItem>
                <SelectItem value="underlined">下划线</SelectItem>
                <SelectItem value="highlighted">高亮</SelectItem>
                <SelectItem value="dotted">点画线</SelectItem>
                <SelectItem value="learning">学习模式</SelectItem>
                <SelectItem value="custom">自定义</SelectItem>
              </SelectContent>
            </Select>
            <!-- 自定义CSS编辑框 -->
            <div
              v-if="settings.translationStyle === 'custom'"
              class="space-y-2 flex-1"
            >
              <Textarea
                id="custom-css"
                :model-value="settings.customTranslationCSS"
                @update:model-value="
                  settings.customTranslationCSS = $event as string
                "
                placeholder="例如: color: #ff0000; font-weight: bold; background-color: #f0f0f0;"
                class="font-mono text-sm"
                rows="4"
              />
              <p class="text-xs text-muted-foreground">
                提示：这里的CSS样式将应用到翻译文本上。请不要包含选择器，直接写样式属性即可。
              </p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardContent>
        <div class="bg-muted p-4 rounded-lg">
          <div class="flex items-center text-sm text-foreground">
            <span>这是一个示例文本，其中包含</span>
            <template v-if="settings.translationPosition === 'before'">
              <span :class="[currentStyleClass, 'mx-1']">
                {{ previewTranslation }}
              </span>
              <span
                class="px-2 py-0.5 bg-background border rounded-md text-sm mx-1"
              >
                原文
              </span>
            </template>
            <template v-else>
              <span
                class="px-2 py-0.5 bg-background border rounded-md text-sm mx-1"
              >
                原文
              </span>
              <span :class="[currentStyleClass, 'mx-1']">
                {{ previewTranslation }}
              </span>
            </template>
            <span>。</span>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>
          <h2 class="text-xl font-bold text-foreground">高级设置</h2>
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="space-y-2">
          <Label>触发模式</Label>
          <RadioGroup
            :model-value="settings.triggerMode"
            @update:model-value="settings.triggerMode = $event as any"
            class="flex items-center space-x-4 pt-2"
          >
            <div class="flex items-center space-x-2">
              <RadioGroupItem id="mode-auto" value="automatic" />
              <Label for="mode-auto">自动翻译</Label>
            </div>
            <div class="flex items-center space-x-2">
              <RadioGroupItem id="mode-manual" value="manual" />
              <Label for="mode-manual">手动触发</Label>
            </div>
          </RadioGroup>
        </div>
        <div class="space-y-2">
          <Label for="max-length">最大处理长度</Label>
          <Input
            id="max-length"
            type="number"
            :model-value="settings.maxLength"
            @update:model-value="settings.maxLength = Number($event)"
            placeholder="例如: 400"
          />
        </div>
        <div class="space-y-2">
          <Label for="user-level">
            单词熟悉度 ({{ getUserLevelLabel(settings.userLevel) }})
          </Label>
          <Slider
            id="user-level"
            :model-value="[settings.userLevel]"
            @update:model-value="settings.userLevel = ($event || [1])[0]"
            :min="1"
            :max="5"
            :step="1"
          />
        </div>
        <div class="space-y-2">
          <Label for="replacement-rate">
            替换率 (Replacement Rate:
            {{ Math.round(settings.replacementRate * 100) }}%)
          </Label>
          <Slider
            id="replacement-rate"
            :model-value="[settings.replacementRate]"
            @update:model-value="settings.replacementRate = ($event || [0])[0]"
            :min="0"
            :max="1"
            :step="0.01"
          />
        </div>
      </CardContent>
    </Card>

    <!-- 懒加载设置 -->
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 class="text-xl font-bold text-foreground">懒加载设置</h2>
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="flex items-center justify-between">
          <div class="space-y-1">
            <Label for="lazy-loading-enabled">启用懒加载翻译</Label>
            <p class="text-xs text-muted-foreground">
              滚动到段落时才进行翻译，减少资源消耗和提高性能
            </p>
          </div>
          <Switch
            id="lazy-loading-enabled"
            :model-value="settings.lazyLoading.enabled"
            @update:model-value="settings.lazyLoading.enabled = $event"
          />
        </div>

        <!-- 预加载距离设置 -->
        <div
          v-if="settings.lazyLoading.enabled"
          class="space-y-2 border-t border-border pt-6"
        >
          <Label for="preload-distance">
            预加载距离 ({{
              Math.round(settings.lazyLoading.preloadDistance * 100)
            }}%)
          </Label>
          <Slider
            id="preload-distance"
            :model-value="[settings.lazyLoading.preloadDistance]"
            @update:model-value="
              settings.lazyLoading.preloadDistance = ($event || [0.5])[0]
            "
            :min="0.0"
            :max="2.0"
            :step="0.1"
            class="w-full"
          />
          <p class="text-xs text-muted-foreground">
            较高的值可以捕获更多段落，但会增加资源消耗。推荐范围：50%-100%
          </p>
        </div>

        <!-- 性能提示 -->
        <div class="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div class="flex items-start space-x-2">
            <svg
              class="w-5 h-5 text-blue-600 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <p class="text-sm font-medium text-blue-900">性能提示</p>
              <p class="text-sm text-blue-700">
                {{
                  settings.lazyLoading.enabled
                    ? '懒加载已启用，将在您滚动时按需翻译内容，有效减少内存使用和提高页面加载速度。'
                    : '懒加载未启用，将一次性翻译整个页面。建议在内容较多的页面开启懒加载。'
                }}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { StorageService } from '@/src/modules/core/storage';
import { StyleManager } from '@/src/modules/styles';
import {
  UserSettings,
  DEFAULT_SETTINGS,
  TranslationPosition,
  TranslationStyle,
} from '@/src/modules/shared/types';
import { getUserLevelLabel } from '@/src/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';

const settings = ref<UserSettings>(DEFAULT_SETTINGS);
const storageService = StorageService.getInstance();
const styleManager = new StyleManager();

const emit = defineEmits<{
  saveMessage: [message: string];
}>();

onMounted(async () => {
  settings.value = await storageService.getUserSettings();
  styleManager.setTranslationStyle(settings.value.translationStyle);
  // 如果是自定义样式，加载自定义CSS
  if (settings.value.translationStyle === TranslationStyle.CUSTOM) {
    styleManager.setCustomCSS(settings.value.customTranslationCSS);
  }
});

const previewTranslation = computed(() => {
  if (settings.value.showParentheses) {
    return '( 翻译 )';
  }
  return '翻译';
});

const currentStyleClass = computed(() => {
  styleManager.setTranslationStyle(settings.value.translationStyle);
  // 如果是自定义样式，更新自定义CSS
  if (settings.value.translationStyle === TranslationStyle.CUSTOM) {
    styleManager.setCustomCSS(settings.value.customTranslationCSS);
  }
  return styleManager.getCurrentStyleClass();
});

watch(
  settings,
  async (newSettings) => {
    await storageService.saveUserSettings(newSettings);
    emit('saveMessage', '设置已保存');
    styleManager.setTranslationStyle(newSettings.translationStyle);
    // 如果是自定义样式，更新自定义CSS
    if (newSettings.translationStyle === TranslationStyle.CUSTOM) {
      styleManager.setCustomCSS(newSettings.customTranslationCSS);
    }
    browser.runtime.sendMessage({
      type: 'settings_updated',
      settings: newSettings,
    });
  },
  { deep: true },
);
</script>

<style scoped>
/* 移除重复的翻译样式CSS - 现在使用StyleManager */
</style>
