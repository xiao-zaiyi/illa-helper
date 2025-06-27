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
            </SelectContent>
          </Select>
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
        <div
          class="border-t border-border pt-6 flex items-center justify-between"
        >
          <div class="space-y-1">
            <Label>清除翻译缓存</Label>
            <p class="text-xs text-muted-foreground">
              如果发现替换率调整后没有生效，可以尝试清除缓存。
            </p>
          </div>
          <Button
            @click="clearCache"
            variant="outline"
            size="sm"
            :disabled="isClearing"
          >
            {{ isClearing ? '清除中...' : '清除缓存' }}
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { StorageManager } from '@/src/modules/storageManager';
import { StyleManager } from '@/src/modules/styleManager';
import {
  UserSettings,
  DEFAULT_SETTINGS,
  TranslationPosition,
  TranslationStyle,
} from '@/src/modules/types';
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
import { Button } from '@/components/ui/button';

const settings = ref<UserSettings>(DEFAULT_SETTINGS);
const storageManager = new StorageManager();
const styleManager = new StyleManager();
const isClearing = ref(false);

const emit = defineEmits<{
  saveMessage: [message: string];
}>();

onMounted(async () => {
  settings.value = await storageManager.getUserSettings();
  styleManager.setTranslationStyle(settings.value.translationStyle);
});

const previewTranslation = computed(() => {
  if (settings.value.showParentheses) {
    return '( 翻译 )';
  }
  return '翻译';
});

const currentStyleClass = computed(() => {
  styleManager.setTranslationStyle(settings.value.translationStyle);
  return styleManager.getCurrentStyleClass();
});

const clearCache = async () => {
  try {
    isClearing.value = true;

    // 发送消息给content script清除缓存
    await browser.runtime.sendMessage({
      type: 'clear_cache',
    });

    emit('saveMessage', '翻译缓存已清除');
  } catch (error) {
    console.error('清除缓存失败:', error);
    emit('saveMessage', '清除缓存失败');
  } finally {
    isClearing.value = false;
  }
};

watch(
  settings,
  async (newSettings) => {
    await storageManager.saveUserSettings(newSettings);
    emit('saveMessage', '设置已保存');
    styleManager.setTranslationStyle(newSettings.translationStyle);
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
