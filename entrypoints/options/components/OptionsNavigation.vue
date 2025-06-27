<template>
  <div class="navigation-container" :class="{ 'mobile': isMobile, 'menu-open': mobileMenuOpen }">
    <!-- 移动端菜单按钮 -->
    <div v-if="isMobile" class="mobile-menu-button" @click="toggleMobileMenu">
      <div class="hamburger" :class="{ 'active': mobileMenuOpen }">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>

    <div class="navigation-content" :class="{ 'mobile': isMobile, 'menu-open': mobileMenuOpen }">
      <!-- 顶部Logo区域 -->
      <div class="h-16 flex items-center px-6 border-b border-sidebar-border">
        <div class="flex items-center space-x-3">
          <img src="/assets/vue.svg" alt="logo" class="w-8 h-8" />
          <div class="py-4">
            <h4
              class="text-sm font-semibold text-center font-mono bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 drop-shadow-[0_0_15px_rgba(236,72,153,0.8)] animate-flicker relative">
              浸入式学语言助手 ILLA Helper
            </h4>
          </div>
          <!-- 移动端关闭按钮 -->
          <button v-if="isMobile" @click="toggleMobileMenu" class="ml-auto text-sidebar-foreground/60">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <!-- 导航菜单 -->
      <nav class="flex-1 px-4 py-6 overflow-y-auto">
        <div class="space-y-6">
          <!-- 基础功能组 -->
          <NavigationGroup title="基础功能" :items="basicFeatures" :current-section="currentSection"
            @section-change="handleSectionChange" />

          <!-- 高级功能组 -->
          <NavigationGroup title="高级功能" :items="advancedFeatures" :current-section="currentSection"
            @section-change="handleSectionChange" />

          <!-- 管理工具组 -->
          <NavigationGroup title="管理工具" :items="managementTools" :current-section="currentSection"
            @section-change="handleSectionChange" />
        </div>
      </nav>
    </div>

    <!-- 移动端背景遮罩 -->
    <div v-if="isMobile && mobileMenuOpen" class="mobile-overlay" @click="toggleMobileMenu"></div>
  </div>
</template>

<script setup lang="ts">
import {
  Settings,
  Languages,
  Shield,
  Circle,
  Download,
  Info,
} from 'lucide-vue-next';
import NavigationGroup from './NavigationGroup.vue';
import { ref, onMounted, onUnmounted, watch } from 'vue';

interface Props {
  currentSection: string;
}

interface NavigationItem {
  key: string;
  label: string;
  icon: any;
  description?: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  sectionChange: [section: string];
}>();

// 移动端适配相关状态
const isMobile = ref(false);
const mobileMenuOpen = ref(false);

// 基础功能组
const basicFeatures: NavigationItem[] = [
  {
    key: 'basic',
    label: '基本设置',
    icon: Settings,
    description: '基础配置和用户偏好',
  },
  {
    key: 'floating',
    label: '悬浮球',
    icon: Circle,
    description: '悬浮工具球配置',
  },
];

// 高级功能组
const advancedFeatures: NavigationItem[] = [
  {
    key: 'translation',
    label: '翻译服务',
    icon: Languages,
    description: 'API配置和翻译策略',
  },
];

// 管理工具组
const managementTools: NavigationItem[] = [
  {
    key: 'blacklist',
    label: '黑名单',
    icon: Shield,
    description: '网站黑名单管理',
  },
  {
    key: 'data',
    label: '导入/导出',
    icon: Download,
    description: '配置备份和恢复',
  },
  {
    key: 'about',
    label: '关于',
    icon: Info,
    description: '版本信息和帮助',
  },
];

// 检查设备是否为移动端
const checkIfMobile = () => {
  isMobile.value = window.innerWidth < 768;
};

// 切换移动端菜单显示状态
const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value;

  // 如果菜单打开，禁止背景滚动
  if (mobileMenuOpen.value) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
};

// 监听窗口大小变化
onMounted(() => {
  checkIfMobile();
  window.addEventListener('resize', checkIfMobile);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkIfMobile);
  // 确保恢复原始状态
  document.body.style.overflow = '';
});

// 监视currentSection变化，在移动端自动关闭菜单
watch(() => props.currentSection, () => {
  if (isMobile.value && mobileMenuOpen.value) {
    mobileMenuOpen.value = false;
    document.body.style.overflow = '';
  }
});

const handleSectionChange = (section: string) => {
  emit('sectionChange', section);
  // 在移动设备上点击导航项后关闭菜单
  if (isMobile.value) {
    mobileMenuOpen.value = false;
    document.body.style.overflow = '';
  }
};
</script>

<style scoped>
.navigation-container {
  width: 16rem;
  border-right: 1px solid var(--sidebar-border, #e2e8f0);
  display: flex;
  flex-direction: column;
  position: relative;
  transition: all 0.3s ease;
}

/* 移动端样式 */
.navigation-container.mobile {
  width: 0;
  border: none;
}

.navigation-content {
  background-color: var(--background, #f1f5f9);
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
}

.navigation-content.mobile {
  position: fixed;
  top: 0;
  left: -100%;
  width: 85%;
  max-width: 270px;
  height: 100vh;
  z-index: 50;
  transition: left 0.3s ease;
  overflow-y: auto;
  box-shadow: 0 0 0 rgba(0, 0, 0, 0);
}

.navigation-content.mobile.menu-open {
  left: 0;
  box-shadow: 4px 0 10px rgba(0, 0, 0, 0.1);
}

/* 汉堡菜单按钮 */
.mobile-menu-button {
  position: fixed;
  top: 12px;
  left: 12px;
  z-index: 40;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background-color: var(--background);
  cursor: pointer;
}

.hamburger {
  width: 20px;
  height: 16px;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.hamburger span {
  display: block;
  height: 2px;
  width: 100%;
  background-color: var(--foreground);
  border-radius: 2px;
  transition: all 0.3s ease;
}

.hamburger.active span:nth-child(1) {
  transform: translateY(7px) rotate(45deg);
}

.hamburger.active span:nth-child(2) {
  opacity: 0;
}

.hamburger.active span:nth-child(3) {
  transform: translateY(-7px) rotate(-45deg);
}

/* 背景遮罩 */
.mobile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.4);
  z-index: 40;
  backdrop-filter: blur(2px);
}
</style>
