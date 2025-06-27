<template>
  <div class="space-y-2">
    <!-- 分组标题 -->
    <h3 class="text-xs font-medium text-sidebar-foreground/60 uppercase tracking-wider px-2 py-1">
      {{ title }}
    </h3>

    <!-- 菜单项列表 -->
    <div class="space-y-1">
      <NavigationItem v-for="item in items" :key="item.key" :item="item" :is-active="currentSection === item.key"
        @click="handleItemClick(item.key)" />
    </div>
  </div>
</template>

<script setup lang="ts">
import NavigationItem from './NavigationItem.vue';
import { ref, onMounted, onUnmounted } from 'vue';

interface NavigationItemData {
  key: string;
  label: string;
  icon: any;
  description?: string;
}

interface Props {
  title: string;
  items: NavigationItemData[];
  currentSection: string;
}

defineProps<Props>();

const emit = defineEmits<{
  sectionChange: [section: string];
}>();

const isMobile = ref(false);

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

const handleItemClick = (section: string) => {
  emit('sectionChange', section);
};
</script>

<style scoped>
/* 移动端优化样式 */
@media (max-width: 767px) {
  h3 {
    margin-top: 8px;
    padding: 8px 12px;
    font-weight: 600;
    letter-spacing: 1px;
    font-size: 11px;
    border-bottom: 1px solid rgba(128, 128, 128, 0.1);
  }

  .space-y-1 {
    margin-bottom: 16px;
  }
}
</style>
