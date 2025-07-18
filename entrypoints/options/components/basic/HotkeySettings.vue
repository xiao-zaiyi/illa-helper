<template>
  <div class="space-y-6">
    <!-- 快捷键设置主卡片 -->
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 class="text-2xl font-bold text-foreground">
            {{ $t('hotkeySettings.title') }}
          </h2>
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
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
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 class="text-lg font-semibold text-foreground">
              {{ $t('hotkeySettings.translatePageHotkey') }}
            </h3>
          </div>

          <div class="space-y-3">
            <div class="space-y-2">
              <Label class="text-sm font-medium flex items-center gap-2">
                {{ $t('hotkeySettings.currentHotkey') }}
                <span
                  class="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                >
                  {{ $t('hotkeySettings.globalSetting') }}
                </span>
              </Label>
              <p class="text-xs text-muted-foreground leading-relaxed">
                {{ $t('hotkeySettings.translatePageDescription') }}
              </p>

              <!-- 当前快捷键显示 -->
              <div class="p-3 bg-background rounded-lg border border-border">
                <div class="flex items-center justify-between">
                  <div class="space-y-1">
                    <div class="font-medium flex items-center space-x-2">
                      <span>
                        {{ $t('hotkeySettings.translateEntirePage') }}
                      </span>
                      <span
                        class="text-xs bg-green-100 text-green-700 px-2 py-1 rounded dark:bg-green-950/30 dark:text-green-300"
                      >
                        {{ $t('hotkeySettings.recommended') }}
                      </span>
                    </div>
                    <div class="text-sm text-muted-foreground">
                      {{ $t('hotkeySettings.quickTranslateDescription') }}
                    </div>
                  </div>
                  <div
                    class="font-mono text-lg px-4 py-1 bg-muted rounded border min-w-[120px] text-center"
                    :class="
                      currentShortcut
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                    "
                  >
                    {{ currentShortcut || $t('hotkeySettings.notSet') }}
                  </div>
                </div>
              </div>

              <!-- 管理快捷键按钮 -->
              <div class="flex justify-end mt-3">
                <Button
                  @click="openShortcutsPage"
                  variant="default"
                  size="sm"
                  class="flex items-center gap-2"
                >
                  <svg
                    class="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  {{ $t('hotkeySettings.manageHotkeys') }}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <!-- 使用说明 -->
        <div
          class="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800"
        >
          <p class="font-medium text-blue-900 dark:text-blue-100 mb-1">
            {{ $t('hotkeySettings.howToModify') }}
          </p>
          <p class="text-blue-800 dark:text-blue-200 mb-2">
            {{ $t('hotkeySettings.modifyInstructions') }}
          </p>
          <p v-if="currentShortcut" class="text-blue-800 dark:text-blue-200">
            {{
              $t('hotkeySettings.currentSetting', { shortcut: currentShortcut })
            }}
          </p>
          <p v-else class="text-blue-800 dark:text-blue-200">
            {{ $t('hotkeySettings.suggestedSetting') }}
          </p>
        </div>
      </CardContent>
    </Card>

    <!-- 快捷键状态检查卡片 -->
    <Card>
      <CardHeader class="pb-3">
        <CardTitle>
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold text-foreground">
              {{ $t('hotkeySettings.statusCheck') }}
            </h3>
            <Button
              @click="checkHotkeyStatus"
              variant="default"
              size="sm"
              :disabled="isChecking"
              class="flex items-center gap-2"
            >
              <div
                v-if="isChecking"
                class="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"
              ></div>
              <svg
                v-else
                class="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span v-if="isChecking">{{ $t('hotkeySettings.checking') }}</span>
              <span v-else>{{ $t('hotkeySettings.checkStatus') }}</span>
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent class="pt-0">
        <!-- 检查结果显示 -->
        <div
          v-if="hotkeyStatus"
          class="p-4 rounded-lg border"
          :class="
            hotkeyStatus.active
              ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800'
              : 'bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800'
          "
        >
          <div class="space-y-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <div
                  class="w-3 h-3 rounded-full"
                  :class="
                    hotkeyStatus.active ? 'bg-green-500' : 'bg-orange-500'
                  "
                ></div>
                <span
                  class="font-medium"
                  :class="
                    hotkeyStatus.active
                      ? 'text-green-900 dark:text-green-100'
                      : 'text-orange-900 dark:text-orange-100'
                  "
                >
                  {{
                    hotkeyStatus.active
                      ? $t('hotkeySettings.hotkeySet')
                      : $t('hotkeySettings.hotkeyNotSet')
                  }}
                </span>
              </div>
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between text-sm">
                <span class="text-muted-foreground">
                  {{ $t('hotkeySettings.shortcut') }}
                </span>
                <span class="font-mono">
                  {{ hotkeyStatus.shortcut || $t('hotkeySettings.notSet') }}
                </span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-muted-foreground">
                  {{ $t('hotkeySettings.command') }}
                </span>
                <span>{{ $t('hotkeySettings.translateEntirePage') }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-muted-foreground">
                  {{ $t('hotkeySettings.status') }}
                </span>
                <span class="text-sm text-muted-foreground">
                  {{ $t('hotkeySettings.pleaseSetHotkey') }}
                </span>
              </div>
            </div>

            <div class="text-xs text-muted-foreground">
              {{ $t('hotkeySettings.clickManageButton') }}
              <a
                href="chrome://extensions/shortcuts"
                target="_blank"
                class="text-primary hover:underline"
              >
                chrome://extensions/shortcuts
              </a>
            </div>
          </div>
        </div>

        <!-- 未检查状态提示 -->
        <div v-else class="p-4 rounded-lg border border-border bg-muted/50">
          <div class="text-center space-y-2">
            <div
              class="w-12 h-12 mx-auto bg-muted rounded-full flex items-center justify-center"
            >
              <svg
                class="h-6 w-6 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p class="text-sm text-muted-foreground">
              {{ $t('hotkeySettings.clickCheckButton') }}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const { t } = useI18n();

// 当前快捷键
const currentShortcut = ref<string>('');

// 快捷键状态检查相关
const isChecking = ref(false);
const hotkeyStatus = ref<any>(null);

// 初始化时获取当前快捷键
onMounted(async () => {
  await loadCurrentShortcut();
});

// 加载当前快捷键设置
const loadCurrentShortcut = async () => {
  try {
    const commands = await browser.commands.getAll();
    const translateCommand = commands.find(
      (cmd) => cmd.name === 'translate-page',
    );
    currentShortcut.value = translateCommand?.shortcut || '';
  } catch (error) {
    console.error(t('errors.getHotkeyFailed'), error);
  }
};

// 打开快捷键管理页面
const openShortcutsPage = () => {
  browser.tabs.create({
    url: 'chrome://extensions/shortcuts',
  });
};

// 检查快捷键状态
const checkHotkeyStatus = async () => {
  isChecking.value = true;
  try {
    const commands = await browser.commands.getAll();
    console.log('当前注册的命令:', commands);

    const translateCommand = commands.find(
      (cmd) => cmd.name === 'translate-page',
    );
    const isActive = translateCommand && translateCommand.shortcut;

    // 同时更新当前快捷键显示
    currentShortcut.value = translateCommand?.shortcut || '';

    hotkeyStatus.value = {
      active: isActive,
      shortcut: translateCommand?.shortcut || '',
      message: isActive
        ? t('hotkeySettings.hotkeySet')
        : t('hotkeySettings.pleaseSetHotkey'),
    };
  } catch (error) {
    console.error(t('errors.checkHotkeyFailed'), error);
    emit('saveMessage', t('hotkeySettings.checkFailed'));
  } finally {
    isChecking.value = false;
  }
};

const emit = defineEmits<{
  saveMessage: [message: string];
}>();
</script>

<style scoped>
.font-mono {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}
</style>
