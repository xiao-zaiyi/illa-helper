<template>
  <div class="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 class="text-2xl font-bold text-foreground">
            {{ $t('appearanceSettings.floatingBall.title') }}
          </h2>
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="border-t border-border pt-6">
          <div class="space-y-6">
            <div class="flex items-center justify-between">
              <div class="space-y-1">
                <Label for="floating-ball-enabled">
                  {{ $t('appearanceSettings.floatingBall.enabled') }}
                </Label>
              </div>
              <Switch
                id="floating-ball-enabled"
                :model-value="settings.floatingBall.enabled"
                @update:model-value="settings.floatingBall.enabled = $event"
              />
            </div>
            <div class="space-y-2">
              <Label for="floating-ball-position">
                {{ $t('appearanceSettings.floatingBall.position') }} ({{
                  settings.floatingBall.position
                }}%)
              </Label>
              <Slider
                id="floating-ball-position"
                :model-value="[settings.floatingBall.position]"
                @update:model-value="
                  settings.floatingBall.position = ($event || [50])[0]
                "
                :min="0"
                :max="100"
                :step="1"
                class="max-w-[50%]"
              />
            </div>
            <div class="space-y-2">
              <Label for="floating-ball-opacity">
                {{ $t('appearanceSettings.floatingBall.opacity') }} ({{
                  settings.floatingBall.opacity
                }})
              </Label>
              <Slider
                id="floating-ball-opacity"
                :model-value="[settings.floatingBall.opacity]"
                @update:model-value="
                  settings.floatingBall.opacity = ($event || [1])[0]
                "
                :min="0.1"
                :max="1"
                :step="0.1"
                class="max-w-[50%]"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- 悬浮词义框设置 -->
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 class="text-2xl font-bold text-foreground">
            {{ $t('appearanceSettings.pronunciationTooltip.title') }}
          </h2>
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="flex items-center justify-between">
          <div class="space-y-1">
            <Label for="enable-pronunciation">
              {{ $t('appearanceSettings.pronunciationTooltip.enabled') }}
            </Label>
            <p class="text-xs text-muted-foreground">
              {{ $t('appearanceSettings.pronunciationTooltip.description') }}
            </p>
          </div>
          <Switch
            id="enable-pronunciation"
            :model-value="settings.enablePronunciationTooltip"
            @update:model-value="settings.enablePronunciationTooltip = $event"
          />
        </div>

        <!-- 快捷键设置 -->
        <div
          v-if="settings.enablePronunciationTooltip"
          class="flex items-center justify-between"
        >
          <div class="space-y-1">
            <Label for="hotkey-enabled">
              {{ $t('appearanceSettings.pronunciationTooltip.hotkey') }}
            </Label>
            <p class="text-xs text-muted-foreground">
              {{
                $t('appearanceSettings.pronunciationTooltip.hotkeyDescription')
              }}
            </p>
          </div>
          <Switch
            id="hotkey-enabled"
            :model-value="settings.pronunciationHotkey.enabled"
            @update:model-value="settings.pronunciationHotkey.enabled = $event"
          />
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { StorageService } from '@/src/modules/core/storage';
import { UserSettings } from '@/src/modules/shared/types/storage';
import { DEFAULT_SETTINGS } from '@/src/modules/shared/constants/defaults';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';

const { t } = useI18n();

const settings = ref<UserSettings>(DEFAULT_SETTINGS);
const storageService = StorageService.getInstance();

const emit = defineEmits<{
  saveMessage: [message: string];
}>();

onMounted(async () => {
  settings.value = await storageService.getUserSettings();
});

watch(
  settings,
  async (newSettings) => {
    // 关键修复：保存前获取最新的 apiConfigs，防止覆盖 TranslationSettings 的修改
    const latestSettings = await storageService.getUserSettings();
    newSettings.apiConfigs = latestSettings.apiConfigs;

    await storageService.saveUserSettings(newSettings);
    emit('saveMessage', t('settings.save'));
    browser.runtime.sendMessage({
      type: 'settings_updated',
      settings: newSettings,
    });
  },
  { deep: true },
);
</script>
