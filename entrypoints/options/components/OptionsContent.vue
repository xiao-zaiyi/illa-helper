<template>
  <div class="flex-1 overflow-y-auto bg-background">
    <!-- 内容区域 -->
    <div :class="['p-4 md:p-6', { 'pt-20': isMobile }]">
      <div class="max-w-4xl mx-auto">
        <Transition name="fade" mode="out-in">
          <div
            v-if="currentSection"
            :id="currentSection"
            class="anchor-section"
          >
            <component
              :is="currentComponent"
              :key="currentSection"
              @save-message="handleSaveMessage"
            />
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import BlacklistManagement from './blacklist/BlacklistManagement.vue';
import BasicSettings from './basic/BasicSettings.vue';
import TranslationSettings from './translation/TranslationSettings.vue';
import AppearanceSettings from './appearance/AppearanceSettings.vue';
import DataManagement from './data/DataManagement.vue';
import About from './about/About.vue';
import HotkeySettings from './basic/HotkeySettings.vue';

interface Props {
  currentSection: string;
}

const props = defineProps<Props>();
const isMobile = ref(false);

const emit = defineEmits<{
  saveMessage: [message: string];
}>();

// 组件映射
const componentMap: Record<string, any> = {
  basic: BasicSettings,
  translation: TranslationSettings,
  blacklist: BlacklistManagement,
  floating: AppearanceSettings,
  hotkey: HotkeySettings,
  about: About,
  data: DataManagement,
};

const currentComponent = computed(() => {
  return componentMap[props.currentSection] || BlacklistManagement;
});

const handleSaveMessage = (message: string) => {
  emit('saveMessage', message);
};

// 检查设备是否为移动端
const checkIfMobile = () => {
  isMobile.value = window.innerWidth < 768;
};

onMounted(() => {
  checkIfMobile();
  window.addEventListener('resize', checkIfMobile);
});

onUnmounted(() => {
  window.removeEventListener('resize', checkIfMobile);
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.anchor-section {
  scroll-margin-top: 80px;
  /* 考虑顶部导航栏高度 */
}

/* 移动端适配样式 */
@media (max-width: 767px) {
  .anchor-section {
    scroll-margin-top: 60px;
  }
}
</style>
