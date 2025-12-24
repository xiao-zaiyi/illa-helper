<template>
  <div class="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 class="text-2xl font-bold text-foreground">
            {{ $t('basicSettings.title') }}
          </h2>
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="flex items-center justify-between">
          <div class="space-y-1">
            <Label for="extension-enabled">
              {{ $t('basicSettings.enableExtension') }}
            </Label>
            <p class="text-xs text-muted-foreground">
              {{ $t('basicSettings.enableExtensionDescription') }}
            </p>
          </div>
          <Switch
            id="extension-enabled"
            :model-value="settings.isEnabled"
            @update:model-value="settings.isEnabled = $event"
          />
        </div>

        <!-- 界面语言设置 -->
        <div class="border-t border-border pt-6">
          <div class="space-y-1">
            <Label for="interface-language">
              {{ $t('basicSettings.interfaceLanguage') }}
            </Label>
            <p class="text-xs text-muted-foreground">
              {{ $t('basicSettings.interfaceLanguageDescription') }}
            </p>
          </div>
          <div class="mt-2">
            <Select
              id="interface-language"
              :model-value="currentLocale"
              @update:model-value="changeLanguage"
            >
              <SelectTrigger>
                <SelectValue
                  :placeholder="$t('basicSettings.selectInterfaceLanguage')"
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="locale in supportedLocales"
                  :key="locale"
                  :value="locale"
                >
                  {{ getLocaleName(locale) }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <!-- 母语设置 -->
        <div class="border-t border-border pt-6">
          <Label class="text-sm mb-3">
            {{ $t('basicSettings.nativeLanguage') }}
          </Label>
          <div class="space-y-4">
            <!-- 母语选择 -->
            <div class="space-y-2">
              <Select
                id="native-language"
                :model-value="settings.multilingualConfig.nativeLanguage"
                @update:model-value="
                  settings.multilingualConfig.nativeLanguage = $event as string
                "
              >
                <SelectTrigger>
                  <SelectValue
                    :placeholder="$t('basicSettings.selectNativeLanguage')"
                  />
                </SelectTrigger>
                <SelectContent class="max-h-60">
                  <!-- 常用语言组 -->
                  <div
                    class="px-2 py-1.5 text-xs font-medium text-muted-foreground"
                  >
                    {{ $t('basicSettings.popularLanguages') }}
                  </div>
                  <SelectItem
                    v-for="lang in popularNativeLanguages"
                    :key="lang.code"
                    :value="lang.code"
                  >
                    {{ lang.name }} - {{ lang.nativeName }}
                  </SelectItem>

                  <!-- 分隔线 -->
                  <div class="border-t border-border my-1"></div>

                  <!-- 其他语言组 -->
                  <div
                    class="px-2 py-1.5 text-xs font-medium text-muted-foreground"
                  >
                    {{ $t('basicSettings.otherLanguages') }}
                  </div>
                  <SelectItem
                    v-for="lang in otherNativeLanguages"
                    :key="lang.code"
                    :value="lang.code"
                  >
                    {{ lang.name }} - {{ lang.nativeName }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div
          class="flex items-center justify-between border-t border-border pt-6"
        >
          <Label for="show-parentheses">
            {{ $t('basicSettings.showParentheses') }}
          </Label>
          <Switch
            id="show-parentheses"
            :model-value="settings.showParentheses"
            @update:model-value="settings.showParentheses = $event"
          />
        </div>

        <div class="border-t border-border pt-6">
          <Label class="text-sm mb-2">
            {{ $t('basicSettings.translationPosition') }}
          </Label>
          <RadioGroup
            :model-value="settings.translationPosition"
            @update:model-value="
              settings.translationPosition = $event as TranslationPosition
            "
            class="mt-2 flex items-center space-x-4"
          >
            <div class="flex items-center space-x-2">
              <RadioGroupItem id="pos-after" value="after" />
              <Label for="pos-after">{{ $t('basicSettings.afterWord') }}</Label>
            </div>
            <div class="flex items-center space-x-2">
              <RadioGroupItem id="pos-before" value="before" />
              <Label for="pos-before">
                {{ $t('basicSettings.beforeWord') }}
              </Label>
            </div>
          </RadioGroup>
        </div>

        <!-- 翻译模式选择 -->
        <div class="border-t border-border pt-6">
          <div class="space-y-1">
            <Label>{{ $t('basicSettings.translationMode') }}</Label>
            <p class="text-xs text-muted-foreground">
              {{ $t('basicSettings.translationModeDescription') }}
            </p>
          </div>
          <div class="mt-2">
            <RadioGroup
              :model-value="settings.translationMode"
              @update:model-value="
                settings.translationMode = $event as TranslationMode
              "
            >
              <div class="space-y-3">
                <div class="flex items-start space-x-2">
                  <RadioGroupItem id="mode-word" value="word" />
                  <div class="grid gap-1.5 leading-none">
                    <Label
                      for="mode-word"
                      class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {{ $t('basicSettings.translationModes.word') }}
                    </Label>
                    <p class="text-xs text-muted-foreground">
                      {{ $t('basicSettings.translationModes.wordDescription') }}
                    </p>
                  </div>
                </div>
                <div class="flex items-start space-x-2">
                  <RadioGroupItem id="mode-paragraph" value="paragraph" />
                  <div class="grid gap-1.5 leading-none">
                    <Label
                      for="mode-paragraph"
                      class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {{ $t('basicSettings.translationModes.paragraph') }}
                    </Label>
                    <p class="text-xs text-muted-foreground">
                      {{
                        $t(
                          'basicSettings.translationModes.paragraphDescription',
                        )
                      }}
                    </p>
                  </div>
                </div>
              </div>
            </RadioGroup>
          </div>
        </div>

        <div>
          <Label
            for="translation-style"
            class="mb-3 border-t border-border pt-6"
          >
            {{ $t('basicSettings.translationStyle') }}
          </Label>
          <div class="flex space-x-4">
            <Select
              :model-value="settings.translationStyle"
              @update:model-value="
                settings.translationStyle = $event as TranslationStyle
              "
            >
              <SelectTrigger>
                <SelectValue :placeholder="$t('basicSettings.selectStyle')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">
                  {{ $t('basicSettings.styles.default') }}
                </SelectItem>
                <SelectItem value="subtle">
                  {{ $t('basicSettings.styles.subtle') }}
                </SelectItem>
                <SelectItem value="bold">
                  {{ $t('basicSettings.styles.bold') }}
                </SelectItem>
                <SelectItem value="italic">
                  {{ $t('basicSettings.styles.italic') }}
                </SelectItem>
                <SelectItem value="underlined">
                  {{ $t('basicSettings.styles.underlined') }}
                </SelectItem>
                <SelectItem value="highlighted">
                  {{ $t('basicSettings.styles.highlighted') }}
                </SelectItem>
                <SelectItem value="dotted">
                  {{ $t('basicSettings.styles.dotted') }}
                </SelectItem>
                <SelectItem value="learning">
                  {{ $t('basicSettings.styles.learning') }}
                </SelectItem>

                <SelectItem value="custom">
                  {{ $t('basicSettings.styles.custom') }}
                </SelectItem>
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
                :placeholder="$t('basicSettings.customCSSPlaceholder')"
                class="font-mono text-sm"
                rows="4"
              />
              <p class="text-xs text-muted-foreground">
                {{ $t('basicSettings.customCSSHint') }}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardContent>
        <div class="bg-muted p-4 rounded-lg">
          <div class="flex items-center text-sm text-foreground">
            <span>{{ $t('basicSettings.previewText') }}</span>
            <template v-if="settings.translationPosition === 'before'">
              <span :class="[currentStyleClass, 'mx-1']">
                {{ previewTranslation }}
              </span>
              <span
                class="px-2 py-0.5 bg-background border rounded-md text-sm mx-1"
              >
                {{ $t('basicSettings.originalText') }}
              </span>
            </template>
            <template v-else>
              <span
                class="px-2 py-0.5 bg-background border rounded-md text-sm mx-1"
              >
                {{ $t('basicSettings.originalText') }}
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
          <h2 class="text-xl font-bold text-foreground">
            {{ $t('basicSettings.advancedSettings') }}
          </h2>
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="space-y-2">
          <Label>{{ $t('basicSettings.triggerMode') }}</Label>
          <RadioGroup
            :model-value="settings.triggerMode"
            @update:model-value="settings.triggerMode = $event as any"
            class="flex items-center space-x-4 pt-2"
          >
            <div class="flex items-center space-x-2">
              <RadioGroupItem id="mode-auto" value="automatic" />
              <Label for="mode-auto">
                {{ $t('basicSettings.triggerModes.automatic') }}
              </Label>
            </div>
            <div class="flex items-center space-x-2">
              <RadioGroupItem id="mode-manual" value="manual" />
              <Label for="mode-manual">
                {{ $t('basicSettings.triggerModes.manual') }}
              </Label>
            </div>
          </RadioGroup>
        </div>
        <div class="space-y-2">
          <Label for="max-length">{{ $t('basicSettings.maxLength') }}</Label>
          <Input
            id="max-length"
            type="number"
            :model-value="settings.maxLength"
            @update:model-value="settings.maxLength = Number($event)"
            :placeholder="$t('basicSettings.maxLengthPlaceholder')"
          />
        </div>
        <div class="space-y-2">
          <Label for="user-level">{{ $t('basicSettings.userLevel') }}</Label>
          <Select
            id="user-level"
            :model-value="settings.userLevel"
            @update:model-value="settings.userLevel = $event as number"
          >
            <SelectTrigger>
              <SelectValue :placeholder="$t('basicSettings.selectUserLevel')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="option in userLevelOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="space-y-2">
          <Label for="replacement-rate">
            {{ $t('basicSettings.replacementRate') }} （{{
              Math.round(settings.replacementRate * 100)
            }}%）
          </Label>
          <div class="flex items-center space-x-4">
            <Slider
              id="replacement-rate"
              :model-value="[settings.replacementRate]"
              @update:model-value="
                settings.replacementRate = ($event || [0])[0]
              "
              :min="0"
              :max="1"
              :step="0.01"
              class="flex-1 max-w-[50%]"
            />
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- 懒加载设置 -->
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 class="text-xl font-bold text-foreground">
            {{ $t('lazyLoading.title') }}
          </h2>
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="flex items-center justify-between">
          <div class="space-y-1">
            <Label for="lazy-loading-enabled">
              {{ $t('lazyLoading.enabled') }}
            </Label>
            <p class="text-xs text-muted-foreground">
              {{ $t('lazyLoading.description') }}
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
            {{ $t('lazyLoading.preloadDistance') }} （{{
              Math.round(settings.lazyLoading.preloadDistance * 50)
            }}% ）
          </Label>
          <div class="flex items-center space-x-4">
            <Slider
              id="preload-distance"
              :model-value="[settings.lazyLoading.preloadDistance]"
              @update:model-value="
                settings.lazyLoading.preloadDistance = ($event || [0.5])[0]
              "
              :min="0.0"
              :max="2.0"
              :step="0.1"
              class="flex-1 max-w-[50%]"
            />
          </div>
          <p class="text-xs text-muted-foreground">
            {{ $t('lazyLoading.preloadDistanceHint') }}
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
              <p class="text-sm font-medium text-blue-900">
                {{ $t('lazyLoading.performanceHintTitle') }}
              </p>
              <p class="text-sm text-blue-700">
                {{
                  settings.lazyLoading.enabled
                    ? $t('lazyLoading.performanceHintEnabled')
                    : $t('lazyLoading.performanceHintDisabled')
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
import { useI18n } from 'vue-i18n';
import { StorageService } from '@/src/modules/core/storage';
import { StyleManager } from '@/src/modules/styles';
import { LanguageService } from '@/src/modules/core/translation/LanguageService';
import { SUPPORTED_LOCALES, LOCALE_NAMES, setLocale } from '@/src/i18n';
import {
  UserSettings,
  DEFAULT_SETTINGS,
  TranslationPosition,
  TranslationStyle,
  TranslationMode,
} from '@/src/modules/shared/types';
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

const { t, locale } = useI18n();

const settings = ref<UserSettings>(DEFAULT_SETTINGS);
const currentLocale = ref(locale.value);
const supportedLocales = SUPPORTED_LOCALES;
const storageService = StorageService.getInstance();

const getLocaleName = (locale: string) => {
  return LOCALE_NAMES[locale] || locale;
};

const changeLanguage = (newLocale: any) => {
  if (typeof newLocale === 'string') {
    setLocale(newLocale as any);
    locale.value = newLocale;
    currentLocale.value = newLocale;
    window.location.reload();
  }
};
const styleManager = new StyleManager();
const languageService = LanguageService.getInstance();

const emit = defineEmits<{
  saveMessage: [message: string];
}>();

// 获取母语选项
const nativeLanguageOptions = computed(() => {
  return languageService.getNativeLanguageOptions();
});

// 常用母语选项 (基于isPopular属性)
const popularNativeLanguages = computed(() => {
  return nativeLanguageOptions.value.filter((lang) => lang.isPopular);
});

// 其他母语选项
const otherNativeLanguages = computed(() => {
  return nativeLanguageOptions.value.filter((lang) => !lang.isPopular);
});

// 用户级别选项
const userLevelOptions = computed(() => [
  { value: 1, label: t('languageLevel.a1') },
  { value: 2, label: t('languageLevel.a2') },
  { value: 3, label: t('languageLevel.b1') },
  { value: 4, label: t('languageLevel.b2') },
  { value: 5, label: t('languageLevel.c1') },
  { value: 6, label: t('languageLevel.c2') },
]);

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
    return `( ${t('actions.translate')} )`;
  }
  return t('actions.translate');
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
    // 关键修复：保存前获取最新的 apiConfigs，防止覆盖 TranslationSettings 的修改
    const latestSettings = await storageService.getUserSettings();
    newSettings.apiConfigs = latestSettings.apiConfigs;

    await storageService.saveUserSettings(newSettings);
    emit('saveMessage', t('settings.save'));
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
