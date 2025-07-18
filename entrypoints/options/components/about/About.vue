<template>
  <div class="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 class="text-2xl font-bold text-foreground">
            {{ $t('about.title') }}
          </h2>
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="flex items-center space-x-4">
          <img
            src="/assets/logo.png"
            :alt="$t('about.logoAlt')"
            class="w-16 h-16"
          />
          <div>
            <h3 class="text-lg font-semibold">
              {{ $t('about.appName') }}
            </h3>
            <p class="text-sm text-muted-foreground">
              {{ $t('about.version', { version: extensionVersion }) }}
            </p>
          </div>
        </div>
        <div class="prose prose-sm max-w-none text-foreground">
          <p>
            {{ $t('about.description') }}
          </p>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>
          <h2 class="text-xl font-bold text-foreground">
            {{ $t('about.coreFeatures') }}
          </h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul class="list-disc space-y-2 pl-5 text-sm text-foreground">
          <li>
            <strong>{{ $t('about.features.smartTranslation.title') }}:</strong>
            {{ $t('about.features.smartTranslation.description') }}
          </li>
          <li>
            <strong>{{ $t('about.features.pronunciation.title') }}:</strong>
            {{ $t('about.features.pronunciation.description') }}
          </li>
          <li>
            <strong>{{ $t('about.features.learningStyles.title') }}:</strong>
            {{ $t('about.features.learningStyles.description') }}
          </li>
          <li>
            <strong>{{ $t('about.features.interactive.title') }}:</strong>
            {{ $t('about.features.interactive.description') }}
          </li>
        </ul>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>
          <h2 class="text-xl font-bold text-foreground">
            {{ $t('about.versionUpdate') }}
          </h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div class="flex items-center justify-between mb-4">
          <div>
            <p class="text-sm text-muted-foreground">
              {{ $t('about.currentVersion', { version: extensionVersion }) }}
            </p>
            <p v-if="updateInfo?.hasUpdate" class="text-sm text-green-600 mt-1">
              {{
                $t('about.newVersionFound', {
                  version: updateInfo.latestVersion,
                })
              }}
            </p>
            <p
              v-else-if="updateChecked && !updateInfo?.hasUpdate"
              class="text-sm text-muted-foreground mt-1"
            >
              {{ $t('about.latestVersion') }}
            </p>
            <p v-if="lastCheckTime" class="text-xs text-muted-foreground mt-1">
              {{
                $t('about.lastCheck', {
                  time: formatLastCheckTime(lastCheckTime),
                })
              }}
            </p>
          </div>
          <Button
            @click="checkUpdate"
            :disabled="checkingUpdate"
            variant="default"
            size="sm"
          >
            <RefreshCw
              :class="{ 'animate-spin': checkingUpdate }"
              class="w-4 h-4 mr-2"
            />
            {{
              checkingUpdate ? $t('about.checking') : $t('about.checkUpdate')
            }}
          </Button>
        </div>

        <div
          v-if="updateInfo?.hasUpdate"
          class="p-4 bg-green-50/50 dark:bg-green-950/20 rounded-lg border border-green-200/50 dark:border-green-800/30"
        >
          <h4
            class="font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center"
          >
            <PartyPopper class="w-4 h-4 mr-2" />
            {{ $t('about.releaseNotes') }}
          </h4>
          <div
            class="text-sm text-green-800 dark:text-green-200 whitespace-pre-wrap max-h-32 overflow-y-auto"
          >
            {{ formatReleaseNotes(updateInfo.releaseNotes) }}
          </div>
          <!-- 下载信息 -->
          <div
            v-if="
              updateInfo.downloadAssets && updateInfo.downloadAssets.length > 0
            "
            class="mt-3 p-3 bg-white/70 dark:bg-gray-900/70 rounded border border-green-100 dark:border-green-900/50"
          >
            <p
              class="text-xs text-green-700 dark:text-green-300 mb-2 flex items-center"
            >
              <FolderOpen class="w-3 h-3 mr-1" />
              {{
                $t('about.availableDownloads', {
                  browser: currentBrowser.toUpperCase(),
                })
              }}
            </p>
            <div class="space-y-2">
              <div
                v-for="asset in updateInfo.downloadAssets"
                :key="asset.name"
                class="flex items-center justify-between text-xs"
                :class="{ 'font-medium': asset.browserType === currentBrowser }"
              >
                <span class="truncate flex-1 mr-2">
                  {{ asset.name }}
                  <span
                    v-if="asset.browserType === currentBrowser"
                    class="text-green-600 dark:text-green-400"
                  >
                    ({{ $t('about.recommended') }})
                  </span>
                </span>
                <span class="text-gray-500 text-xs">
                  {{ formatFileSize(asset.size) }}
                </span>
              </div>
            </div>
          </div>

          <div class="flex gap-2 mt-3">
            <Button
              @click="downloadFile"
              size="sm"
              :disabled="downloading || !getDownloadAssetForCurrentBrowser()"
              variant="destructive"
            >
              <Download
                :class="{ 'animate-pulse': downloading }"
                class="w-4 h-4 mr-2"
              />
              {{
                downloading ? $t('about.downloading') : $t('about.downloadFile')
              }}
            </Button>
            <Button @click="viewUpdate" variant="secondary" size="sm">
              <ExternalLink class="w-4 h-4 mr-2" />
              {{ $t('about.viewDetails') }}
            </Button>
            <Button @click="dismissUpdate" variant="secondary" size="sm">
              <X class="w-4 h-4 mr-2" />
              {{ $t('about.dismissVersion') }}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>
          <h2 class="text-xl font-bold text-foreground">
            {{ $t('about.supportAndFeedback') }}
          </h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p class="text-sm text-muted-foreground">
          {{ $t('about.supportDescription') }}
        </p>
        <div class="mt-4 flex flex-wrap gap-2">
          <a href="https://github.com/xiao-zaiyi/illa-helper" target="_blank">
            <Button>⭐ {{ $t('about.starOnGitHub') }}</Button>
          </a>
          <a
            href="https://github.com/xiao-zaiyi/illa-helper/issues"
            target="_blank"
          >
            <Button variant="outline">
              <Bug class="w-4 h-4 mr-2" />
              {{ $t('about.reportIssue') }}
            </Button>
          </a>
          <a
            href="https://github.com/xiao-zaiyi/illa-helper/pulls"
            target="_blank"
          >
            <Button variant="outline">
              <GitPullRequest class="w-4 h-4 mr-2" />
              {{ $t('about.contribute') }}
            </Button>
          </a>
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
import { browser } from 'wxt/browser';
import {
  RefreshCw,
  PartyPopper,
  FolderOpen,
  Download,
  ExternalLink,
  Bug,
  GitPullRequest,
  X,
} from 'lucide-vue-next';

const { t } = useI18n();

interface UpdateInfo {
  hasUpdate: boolean;
  latestVersion: string;
  currentVersion: string;
  releaseNotes?: string;
  downloadUrl?: string;
  releaseDate?: string;
  downloadAssets?: DownloadAsset[];
}

interface DownloadAsset {
  name: string;
  downloadUrl: string;
  size: number;
  browserType?: 'chrome' | 'firefox' | 'edge' | 'safari';
}

const extensionVersion = ref('N/A');
const checkingUpdate = ref(false);
const updateChecked = ref(false);
const updateInfo = ref<UpdateInfo | null>(null);
const lastCheckTime = ref<number | null>(null);
const downloading = ref(false);
const currentBrowser = ref<'chrome' | 'firefox' | 'edge' | 'safari'>('chrome');

onMounted(async () => {
  // 在浏览器扩展中，我们可以通过 browser.runtime.getManifest() 获取 manifest.json 的内容
  try {
    const manifest = browser.runtime.getManifest();
    extensionVersion.value = manifest.version;
  } catch (error) {
    console.error(t('errors.getExtensionVersion'), error);
    // 在非扩展环境或开发服务器中，这可能会失败。可以设置一个默认值。
    extensionVersion.value = 'DEV';
  }

  // 加载存储的更新信息
  await loadStoredUpdateInfo();

  // 检测当前浏览器
  currentBrowser.value = detectCurrentBrowser();
});

async function loadStoredUpdateInfo() {
  try {
    const response = await browser.runtime.sendMessage({
      type: 'GET_UPDATE_INFO',
    });
    if (response) {
      updateInfo.value = response;
      updateChecked.value = true;
    }

    // 获取上次检查时间
    const result = await browser.storage.local.get('lastUpdateCheck');
    if (result.lastUpdateCheck) {
      lastCheckTime.value = result.lastUpdateCheck;
    }
  } catch (error) {
    console.error(t('errors.getUpdateInfoFailed'), error);
  }
}

async function checkUpdate() {
  checkingUpdate.value = true;
  try {
    console.log('[About] Starting update check...');
    const response = await browser.runtime.sendMessage({
      type: 'CHECK_UPDATE',
    });
    console.log('[About] Update check response:', response);

    if (response && typeof response === 'object') {
      updateInfo.value = response;
      updateChecked.value = true;
      lastCheckTime.value = Date.now();
    } else {
      console.warn('[About] Invalid update response:', response);
      updateChecked.value = true;
    }
  } catch (error) {
    console.error(t('errors.checkUpdateFailed'), error);
    updateChecked.value = true;
  } finally {
    checkingUpdate.value = false;
  }
}

function viewUpdate() {
  if (updateInfo.value?.downloadUrl) {
    browser.tabs.create({ url: updateInfo.value.downloadUrl });
  }
}

async function dismissUpdate() {
  try {
    if (updateInfo.value?.latestVersion) {
      await browser.runtime.sendMessage({
        type: 'DISMISS_UPDATE',
        version: updateInfo.value.latestVersion,
      });
    }

    // 清除 badge
    await browser.runtime.sendMessage({ type: 'CLEAR_UPDATE_BADGE' });

    // 更新本地状态
    updateInfo.value = { ...updateInfo.value!, hasUpdate: false };
  } catch (error) {
    console.error(t('errors.dismissUpdateFailed'), error);
  }
}

function formatLastCheckTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 60000) {
    // 1分钟内
    return t('time.justNow');
  } else if (diff < 3600000) {
    // 1小时内
    return t('time.minutesAgo', { minutes: Math.floor(diff / 60000) });
  } else if (diff < 86400000) {
    // 24小时内
    return t('time.hoursAgo', { hours: Math.floor(diff / 3600000) });
  } else {
    const days = Math.floor(diff / 86400000);
    return t('time.daysAgo', { days });
  }
}

function detectCurrentBrowser(): 'chrome' | 'firefox' | 'edge' | 'safari' {
  const userAgent = navigator.userAgent.toLowerCase();

  if (userAgent.includes('edg/')) {
    return 'edge';
  } else if (userAgent.includes('firefox')) {
    return 'firefox';
  } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
    return 'safari';
  } else {
    return 'chrome'; // 默认认为是 Chrome 系列
  }
}

function getDownloadAssetForCurrentBrowser(): DownloadAsset | null {
  if (!updateInfo.value?.downloadAssets) return null;

  // 优先查找匹配当前浏览器的文件
  const matchingAsset = updateInfo.value.downloadAssets.find(
    (asset) => asset.browserType === currentBrowser.value,
  );

  if (matchingAsset) return matchingAsset;

  // 如果没有找到匹配的，返回第一个可用的资源
  return updateInfo.value.downloadAssets[0] || null;
}

async function downloadFile() {
  const asset = getDownloadAssetForCurrentBrowser();
  if (!asset) {
    console.error(t('errors.noDownloadFile'));
    return;
  }

  downloading.value = true;
  try {
    // 创建下载链接
    const link = document.createElement('a');
    link.href = asset.downloadUrl;
    link.download = asset.name;
    link.target = '_blank';

    // 触发下载
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log('Starting download:', asset.name);
  } catch (error) {
    console.error(t('errors.downloadFailed'), error);
  } finally {
    downloading.value = false;
  }
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));

  return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
}

function formatReleaseNotes(notes?: string): string {
  if (!notes) return t('about.noReleaseNotes');

  // 简化 markdown 格式，只保留主要内容
  return (
    notes
      .replace(/#{1,6}\s*/g, '') // 移除标题标记
      .replace(/\*\*(.*?)\*\*/g, '$1') // 移除粗体标记
      .replace(/\*(.*?)\*/g, '$1') // 移除斜体标记
      .replace(/`(.*?)`/g, '$1') // 移除代码标记
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 移除链接但保留文本
      .slice(0, 500) + (notes.length > 500 ? '...' : '')
  ); // 限制长度
}
</script>
