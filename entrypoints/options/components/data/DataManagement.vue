<template>
  <div class="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 class="text-2xl font-bold text-foreground">数据管理</h2>
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="space-y-4">
          <h3 class="text-lg font-medium">导出设置</h3>
          <p class="text-sm text-muted-foreground">
            将您当前的所有设置导出为一个JSON文件，包括用户配置、API设置和网站管理规则。您可以保存此文件作为备份，或在其他设备上导入。
          </p>
          <Button @click="exportSettings">
            <Download class="w-4 h-4 mr-2" />
            导出设置
          </Button>
        </div>

        <div class="border-t border-border pt-6 space-y-4">
          <h3 class="text-lg font-medium">导入设置</h3>
          <p class="text-sm text-muted-foreground">
            从JSON文件导入设置，包括用户配置和网站管理规则。请注意：这将覆盖您当前的所有设置。支持新旧格式，旧格式只导入用户设置。
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
              确认导入
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { StorageService } from '@/src/modules/core/storage';
import { WebsiteManager } from '@/src/modules/options/website-management/manager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Download, Upload } from 'lucide-vue-next';

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
      `设置已成功导出！包含 ${websiteRules.length} 个网站规则。`,
      'success',
    );
  } catch (error) {
    console.error('Failed to export settings:', error);
    emit('saveMessage', '导出失败，请查看控制台获取详情。', 'error');
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
    emit('saveMessage', '请先选择一个文件。', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const result = event.target?.result;
      if (typeof result !== 'string') {
        throw new Error('无法读取文件内容。');
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

        const message = `导入完成！`;
        emit('saveMessage', message, 'success');
      } else if (
        importedData.isEnabled !== undefined ||
        importedData.apiConfigs !== undefined
      ) {
        // 旧格式：只有用户设置
        await storageService.saveUserSettings(importedData);
        importStats.settings = true;

        emit('saveMessage', '用户设置已成功导入！', 'success');
      } else {
        throw new Error('无法识别的文件格式');
      }

      // 重新加载页面以应用更改
      setTimeout(() => {
        location.reload();
      }, 2000);
    } catch (error) {
      console.error('Failed to import settings:', error);
      emit('saveMessage', '导入失败，文件格式可能不正确。', 'error');
    }
  };
  reader.onerror = () => {
    emit('saveMessage', '读取文件时发生错误。', 'error');
  };
  reader.readAsText(selectedFile.value);
};
</script>
