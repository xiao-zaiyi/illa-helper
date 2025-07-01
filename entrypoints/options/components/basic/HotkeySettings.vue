<template>
  <div class="space-y-6">
    <!-- 页面标题 -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-foreground">快捷键设置</h2>
        <p class="text-sm text-muted-foreground mt-1">
          管理翻译整页快捷键设置
        </p>
      </div>
    </div>

    <!-- 快捷键信息 -->
    <div class="bg-card p-6 rounded-lg border border-border">
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-foreground">翻译整页快捷键</h3>
          <Button
            variant="outline"
            @click="openShortcutsPage"
            class="text-sm"
          >
            管理快捷键
          </Button>
        </div>
        
                 <!-- 当前快捷键状态 -->
         <div class="p-4 bg-muted/50 rounded-lg">
           <div class="flex items-center justify-between">
             <div class="space-y-1">
               <div class="font-medium flex items-center space-x-2">
                 <span>翻译整个页面</span>
                 <span class="text-xs bg-primary/10 text-primary px-2 py-1 rounded">推荐</span>
               </div>
               <div class="text-sm text-muted-foreground">按快捷键翻译当前页面的所有文本</div>
             </div>
             <div class="font-mono text-lg px-4 py-2 bg-background rounded border" :class="currentShortcut ? 'text-foreground' : 'text-muted-foreground'">
               {{ currentShortcut || '未设置' }}
             </div>
           </div>
         </div>
        
                 <div class="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
           <p class="font-medium text-blue-900 dark:text-blue-100 mb-1">💡 如何修改快捷键：</p>
           <p class="text-blue-800 dark:text-blue-200 mb-2">
             点击上方"管理快捷键"按钮，或访问 chrome://extensions/shortcuts 来自定义快捷键组合
           </p>
           <p v-if="currentShortcut" class="text-blue-800 dark:text-blue-200">
             当前设置：{{ currentShortcut }}
           </p>
           <p v-else class="text-blue-800 dark:text-blue-200">
             建议设置：Ctrl+Shift+T (Mac: Command+Shift+T)
           </p>
         </div>
      </div>
    </div>

    <!-- 快捷键状态检查 -->
    <div class="bg-card p-6 rounded-lg border border-border">
      <div class="space-y-4">
        <h3 class="text-lg font-semibold text-foreground">快捷键状态检查</h3>
        
        <div class="space-y-3">
          <Button
            @click="checkHotkeyStatus"
            variant="outline"
            class="w-full"
            :disabled="isChecking"
          >
            <span v-if="isChecking">检查中...</span>
            <span v-else>检查快捷键状态</span>
          </Button>
          
          <div v-if="hotkeyStatus" class="p-3 rounded-lg border" :class="hotkeyStatus.active ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800' : 'bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800'">
            <div class="space-y-2">
              <div class="flex items-center space-x-2">
                <div class="w-2 h-2 rounded-full" :class="hotkeyStatus.active ? 'bg-green-500' : 'bg-orange-500'"></div>
                <span class="font-medium" :class="hotkeyStatus.active ? 'text-green-900 dark:text-green-100' : 'text-orange-900 dark:text-orange-100'">
                  {{ hotkeyStatus.active ? '快捷键已设置' : '快捷键未设置' }}
                </span>
              </div>
              <div class="text-sm" :class="hotkeyStatus.active ? 'text-green-800 dark:text-green-200' : 'text-orange-800 dark:text-orange-200'">
                <div class="flex justify-between">
                  <span>翻译整个页面</span>
                  <span class="font-mono">{{ hotkeyStatus.shortcut || '未设置' }}</span>
                </div>
              </div>
              <div v-if="!hotkeyStatus.active" class="text-xs text-orange-700 dark:text-orange-300">
                请点击"管理快捷键"按钮设置快捷键
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Button } from '@/components/ui/button';

const emit = defineEmits<{
  saveMessage: [message: string];
}>();

// 当前快捷键
const currentShortcut = ref<string>('');

// 快捷键状态检查相关
const isChecking = ref(false);
const hotkeyStatus = ref<{
  active: boolean;
  shortcut: string;
} | null>(null);

// 初始化时获取当前快捷键
onMounted(async () => {
  await loadCurrentShortcut();
});

// 加载当前快捷键设置
async function loadCurrentShortcut() {
  try {
    const commands = await browser.commands.getAll();
    const translatePageCommand = commands.find(cmd => cmd.name === 'translate-page');
    currentShortcut.value = translatePageCommand?.shortcut || '';
  } catch (error) {
    console.error('获取当前快捷键失败:', error);
    currentShortcut.value = '';
  }
}

// 打开快捷键管理页面
function openShortcutsPage() {
  browser.tabs.create({ url: 'chrome://extensions/shortcuts' });
}

// 检查快捷键状态
async function checkHotkeyStatus() {
  isChecking.value = true;
  
  try {
    const commands = await browser.commands.getAll();
    console.log('当前注册的命令:', commands);
    
    const translatePageCommand = commands.find(cmd => cmd.name === 'translate-page');
    const shortcut = translatePageCommand?.shortcut || '';
    
    // 同时更新当前快捷键显示
    currentShortcut.value = shortcut;
    
    const isActive = shortcut && shortcut.trim() !== '';
    
    hotkeyStatus.value = {
      active: !!isActive,
      shortcut: shortcut
    };
    
    emit('saveMessage', isActive ? '快捷键已正确设置' : '快捷键未设置，请点击"管理快捷键"进行设置');
  } catch (error) {
    console.error('检查快捷键状态失败:', error);
    emit('saveMessage', '检查快捷键状态失败');
  } finally {
    isChecking.value = false;
  }
}
</script>

<style scoped>
.font-mono {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}
</style> 