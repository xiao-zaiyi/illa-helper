<template>
  <div class="min-h-screen bg-background text-foreground">
    <!-- 主容器 -->
    <div class="flex flex-col md:flex-row h-screen">
      <!-- 左侧导航栏 -->
      <OptionsNavigation
        :current-section="currentSection"
        @section-change="handleSectionChange"
      />

      <!-- 右侧内容区域 -->
      <div class="flex-1 flex flex-col">
        <!-- 顶部状态栏 -->
        <div
          class="h-16 bg-card border-b border-border flex items-center justify-between px-4 md:px-6"
          :class="{ 'mobile-header': isMobile }"
        >
          <div class="flex items-center space-x-4">
            <h1 class="text-xl font-semibold" :class="{ 'ml-12': isMobile }">
              {{ getSectionTitle(currentSection) }}
            </h1>
          </div>
          <div class="flex items-center space-x-4">
            <!-- 保存状态指示器 -->
            <div
              v-if="saveMessage"
              class="hidden md:block text-sm text-muted-foreground"
            >
              {{ saveMessage }}
            </div>
            <!-- 主题切换按钮 -->
            <button
              @click="toggleTheme"
              class="p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
              title="切换主题"
            >
              <component :is="isDark ? Sun : Moon" class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- 移动端保存状态提示 -->
        <div
          v-if="saveMessage && isMobile"
          class="fixed bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-primary text-primary-foreground rounded-md shadow-lg z-50"
        >
          {{ saveMessage }}
        </div>

        <!-- 主内容区域 -->
        <OptionsContent
          :current-section="currentSection"
          @save-message="handleSaveMessage"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted } from 'vue';
import { Sun, Moon } from 'lucide-vue-next';
import OptionsNavigation from './components/OptionsNavigation.vue';
import OptionsContent from './components/OptionsContent.vue';

// 当前选中的设置模块
const currentSection = ref('basic');

// 保存状态消息
const saveMessage = ref('');

// 主题状态
const isDark = ref(false);

// 移动端状态
const isMobile = ref(false);

// 设置模块标题映射
const sectionTitles: Record<string, string> = {
  basic: '基本设置',
  translation: '翻译服务',
  'website-management': '网站管理',
  floating: '悬浮球',
  hotkey: '快捷键',
  data: '导入/导出',
  about: '关于',
};

// 检查设备是否为移动端
const checkIfMobile = () => {
  isMobile.value = window.innerWidth < 768;
};

onMounted(async () => {
  // 优先从存储中加载主题设置
  const storedTheme = await browser.storage.local.get('theme');
  if (storedTheme.theme) {
    isDark.value = storedTheme.theme === 'dark';
  } else {
    // 如果存储中没有，则根据系统偏好设置
    isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  applyTheme();

  // 检查URL中的锚点参数
  const hash = window.location.hash.substring(1);
  if (hash && sectionTitles[hash]) {
    currentSection.value = hash;
  }

  // 监听浏览器前进后退按钮
  window.addEventListener('hashchange', handleHashChange);

  // 初始检测设备类型
  checkIfMobile();
  window.addEventListener('resize', checkIfMobile);
});

// 移除事件监听器
onUnmounted(() => {
  window.removeEventListener('hashchange', handleHashChange);
  window.removeEventListener('resize', checkIfMobile);
});

// 监听currentSection变化，更新URL锚点
watch(currentSection, (newSection) => {
  if (window.location.hash.substring(1) !== newSection) {
    window.history.pushState(null, '', `#${newSection}`);
  }
});

const handleHashChange = () => {
  const hash = window.location.hash.substring(1);
  if (hash && sectionTitles[hash]) {
    currentSection.value = hash;
  }
};

const handleSectionChange = (section: string) => {
  currentSection.value = section;

  // 短暂延迟后滚动到对应的锚点位置，确保内容已渲染
  setTimeout(() => {
    const element = document.getElementById(section);
    if (element) {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }, 100);
};

const handleSaveMessage = (message: string) => {
  saveMessage.value = message;
  setTimeout(() => {
    saveMessage.value = '';
  }, 3000);
};

const getSectionTitle = (section: string): string => {
  return sectionTitles[section] || '设置';
};

const toggleTheme = async () => {
  isDark.value = !isDark.value;
  applyTheme();
  // 将主题偏好保存到存储中
  await browser.storage.local.set({ theme: isDark.value ? 'dark' : 'light' });
};

const applyTheme = () => {
  const html = document.documentElement;
  if (isDark.value) {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }
};
</script>

<style scoped>
/* 移动端标题样式 */
.mobile-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 30;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

@media (max-width: 767px) {
  .min-h-screen {
    height: 100vh;
    width: 100vw;
    overflow-x: hidden;
  }
}
</style>
