<template>
  <div class="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 class="text-2xl font-bold text-foreground">
            {{ $t('dataManagement.title') }}
          </h2>
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="space-y-4">
          <h3 class="text-lg font-medium">
            {{ $t('dataManagement.exportSettings.title') }}
          </h3>
          <p class="text-sm text-muted-foreground">
            {{ $t('dataManagement.exportSettings.description') }}
          </p>
          <Button @click="exportSettings">
            <Download class="w-4 h-4 mr-2" />
            {{ $t('dataManagement.exportSettings.button') }}
          </Button>
        </div>

        <div class="border-t border-border pt-6 space-y-4">
          <h3 class="text-lg font-medium">
            {{ $t('dataManagement.importSettings.title') }}
          </h3>
          <p class="text-sm text-muted-foreground">
            {{ $t('dataManagement.importSettings.description') }}
          </p>
          <div class="flex items-center space-x-2">
            <Input
              id="import-file"
              type="file"
              @change="handleFileSelect"
              accept=".json"
              class="max-w-xs"
            />
            <Button @click="importSettings" :disabled="!selectedFile">
              <Upload class="w-4 h-4 mr-2" />
              {{ $t('dataManagement.importSettings.button') }}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { StorageService } from '@/src/modules/core/storage';
import { WebsiteManager } from '@/src/modules/options/website-management/manager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Download, Upload } from 'lucide-vue-next';

const { t } = useI18n();

const storageService = StorageService.getInstance();
const websiteManager = new WebsiteManager();
const selectedFile = ref<File | null>(null);

const emit = defineEmits<{
  saveMessage: [message: string, type?: 'success' | 'error'];
}>();

const exportSettings = async () => {
  try {
    const settings = await storageService.getUserSettings();
    const websiteRules = await websiteManager.getRules();

    const exportData = {
      exportTime: new Date().toISOString(),
      version: '2.0', // 增加版本号以区分包含网站管理数据的新格式
      userSettings: settings,
      websiteManagement: {
        rules: websiteRules,
      },
    };

    const settingsJson = JSON.stringify(exportData, null, 2);
    const blob = new Blob([settingsJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `illa-helper-complete-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    emit(
      'saveMessage',
      t('dataManagement.exportSettings.success', {
        count: websiteRules.length,
      }),
      'success',
    );
  } catch (error) {
    console.error('Failed to export settings:', error);
    emit('saveMessage', t('dataManagement.exportSettings.error'), 'error');
  }
};

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files.length > 0) {
    selectedFile.value = target.files[0];
  } else {
    selectedFile.value = null;
  }
};

const importSettings = async () => {
  if (!selectedFile.value) {
    emit('saveMessage', t('dataManagement.importSettings.selectFile'), 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const result = event.target?.result;
      if (typeof result !== 'string') {
        throw new Error(t('dataManagement.errors.cannotReadFile'));
      }

      const importedData = JSON.parse(result);
      let importStats = { settings: false, websiteRules: 0 };

      // 检查数据格式并导入
      if (importedData.version === '2.0' && importedData.userSettings) {
        // 新格式：包含完整数据
        await storageService.saveUserSettings(importedData.userSettings);
        importStats.settings = true;

        // 导入网站管理数据
        if (importedData.websiteManagement?.rules) {
          // 清除现有缓存
          websiteManager.clearCache();

          // 导入网站规则
          for (const rule of importedData.websiteManagement.rules) {
            if (rule.pattern && rule.type) {
              await websiteManager.addRule(
                rule.pattern,
                rule.type,
                rule.description,
              );
              importStats.websiteRules++;
            }
          }
        }

        const message = t('dataManagement.importSettings.success');
        emit('saveMessage', message, 'success');
      } else if (
        importedData.isEnabled !== undefined ||
        importedData.apiConfigs !== undefined
      ) {
        // 旧格式：只有用户设置
        await storageService.saveUserSettings(importedData);
        importStats.settings = true;

        emit(
          'saveMessage',
          t('dataManagement.importSettings.userSettingsSuccess'),
          'success',
        );
      } else {
        throw new Error(t('dataManagement.importSettings.unrecognizedFormat'));
      }

      // 重新加载页面以应用更改
      setTimeout(() => {
        location.reload();
      }, 2000);
    } catch (error) {
      console.error('Failed to import settings:', error);
      emit('saveMessage', t('dataManagement.importSettings.error'), 'error');
    }
  };
  reader.onerror = () => {
    emit('saveMessage', t('dataManagement.importSettings.readError'), 'error');
  };
  reader.readAsText(selectedFile.value);
};
</script>
