<template>
  <a :href="`#${item.key}`" @click="handleClick" :class="[
    'w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 no-underline',
    'focus:outline-none focus:ring-2 focus:ring-sidebar-ring tap-highlight-transparent',
    isActive
      ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm hover:brightness-90'
      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
  ]">
    <!-- 图标 -->
    <component :is="item.icon" :class="[
      'w-5 h-5 flex-shrink-0',
      isActive
        ? 'text-sidebar-primary-foreground'
        : 'text-sidebar-foreground/70',
    ]" />

    <!-- 文本内容 -->
    <div class="flex-1 min-w-0">
      <div class="text-sm font-medium">{{ item.label }}</div>
      <div v-if="item.description" :class="[
        'text-xs line-clamp-1',
        isActive
          ? 'text-sidebar-primary-foreground/70'
          : 'text-sidebar-foreground/50',
      ]">
        {{ item.description }}
      </div>
    </div>

    <!-- 活跃状态指示器 -->
    <div v-if="isActive" class="w-2 h-2 bg-sidebar-primary-foreground rounded-full flex-shrink-0" />
  </a>
</template>

<script setup lang="ts">
interface NavigationItem {
  key: string;
  label: string;
  icon: any;
  description?: string;
}

interface Props {
  item: NavigationItem;
  isActive: boolean;
}

defineProps<Props>();

const emit = defineEmits<{
  click: [];
}>();

const handleClick = (e: MouseEvent) => {
  // 在移动端增加点击响应面积和更好的触摸反馈
  emit('click');
};
</script>

<style scoped>
/* 去除移动端点击高亮 */
.tap-highlight-transparent {
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
  touch-action: manipulation;
}

/* 增强移动端触摸体验 */
@media (max-width: 767px) {
  a {
    padding: 12px 16px;
    margin-bottom: 4px;
  }
}

/* 增加活跃状态指示器的可见性 */
@media (max-width: 767px) {
  a:active {
    transform: scale(0.98);
  }
}
</style>
