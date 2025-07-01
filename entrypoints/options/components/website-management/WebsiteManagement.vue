<template>
  <div class=" mx-auto space-y-6">
    <!-- 页面标题和描述 -->
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 class="text-2xl font-bold text-foreground">网站管理</h2>
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="space-y-2">
          <p class="text-muted-foreground">
            管理翻译功能的网站规则。黑名单禁用翻译，白名单强制自动翻译。
          </p>
        </div>

        <!-- 操作工具栏 -->
        <div class="bg-card rounded-lg border border-border p-4">
          <div class="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <!-- 左侧：搜索和筛选 -->
            <div class="flex flex-col sm:flex-row gap-3 flex-1">
              <!-- 搜索框 -->
              <div class="relative flex-1 max-w-md">
                <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="搜索网站模式..."
                  class="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <!-- 类型筛选 -->
              <div class="flex gap-2">
                <button
                  @click="filterType = 'all'"
                  :class="[
                    'px-3 py-2 rounded-md text-sm transition-colors',
                    filterType === 'all'
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border hover:bg-accent hover:text-accent-foreground'
                  ]"
                >
                  全部 ({{ allRules.length }})
                </button>
                <button
                  @click="filterType = 'blacklist'"
                  :class="[
                    'px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-1',
                    filterType === 'blacklist'
                      ? 'bg-red-600 text-white'
                      : 'border border-border hover:bg-accent hover:text-accent-foreground'
                  ]"
                >
                  <Shield class="w-3 h-3" />
                  黑名单 ({{ blacklistCount }})
                </button>
                <button
                  @click="filterType = 'whitelist'"
                  :class="[
                    'px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-1',
                    filterType === 'whitelist'
                      ? 'bg-green-600 text-white'
                      : 'border border-border hover:bg-accent hover:text-accent-foreground'
                  ]"
                >
                  <Heart class="w-3 h-3" />
                  白名单 ({{ whitelistCount }})
                </button>
              </div>
            </div>

            <!-- 右侧：操作按钮 -->
            <div class="flex gap-2">
              <button
                @click="showAddDialog = true"
                class="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                <Plus class="w-4 h-4" />
                添加规则
              </button>

                              <button
                  v-if="selectedRules.length > 0"
                  @click="bulkDeleteRules"
                  class="inline-flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
                >
                  <Trash2 class="w-4 h-4" />
                  删除选中 ({{ selectedRules.length }})
                </button>
            </div>
          </div>
        </div>

                <!-- 规则表格 -->
        <div class="bg-card rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead class="w-12">
                  <input
                    v-model="selectAll"
                    @change="handleSelectAll"
                    type="checkbox"
                    class="rounded border-border focus:ring-ring"
                  />
                </TableHead>
                <TableHead class="w-24">类型</TableHead>
                <TableHead class="w-96">网站模式</TableHead>
                <TableHead class="w-64">描述</TableHead>
                <TableHead class="w-20">状态</TableHead>
                <TableHead class="w-12 text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="rule in filteredRules"
                :key="rule.id"
                class="hover:bg-muted/25"
              >
                <TableCell>
                  <input
                    v-model="selectedRules"
                    :value="rule.id"
                    type="checkbox"
                    class="rounded border-border focus:ring-ring"
                  />
                </TableCell>
                <TableCell>
                  <div class="flex items-center gap-1">
                    <div
                      :class="[
                        'p-1 rounded-full',
                        rule.type === 'blacklist' 
                          ? 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                          : 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                      ]"
                    >
                      <Shield v-if="rule.type === 'blacklist'" class="w-3 h-3" />
                      <Heart v-else class="w-3 h-3" />
                    </div>
                    <span class="text-xs font-medium">
                      {{ rule.type === 'blacklist' ? '黑名单' : '白名单' }}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div class="group relative">
                    <code 
                      class="px-2 py-1 bg-muted rounded text-sm font-mono block truncate pr-8" 
                      :title="rule.pattern"
                    >{{ rule.pattern }}</code>
                    <button
                      @click="copyToClipboard(rule.pattern)"
                      class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-background rounded text-xs"
                      title="复制"
                    >
                      📋
                    </button>
                  </div>
                </TableCell>
                <TableCell>
                  <span 
                    class="text-sm text-muted-foreground block truncate" 
                    :title="rule.description || '-'"
                  >
                    {{ rule.description || '-' }}
                  </span>
                </TableCell>
                <TableCell>
                  <button
                    @click="toggleRule(rule.id)"
                    :class="[
                      'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors',
                      rule.enabled
                        ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-900/20 dark:text-gray-400'
                    ]"
                  >
                    <div
                      :class="[
                        'w-1.5 h-1.5 rounded-full',
                        rule.enabled ? 'bg-green-500' : 'bg-gray-400'
                      ]"
                    />
                    {{ rule.enabled ? '启用' : '禁用' }}
                  </button>
                </TableCell>
                <TableCell class="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                      <Button variant="ghost" class="h-8 w-8 p-0">
                        <span class="sr-only">打开菜单</span>
                        <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                        </svg>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem @click="editRule(rule)">
                        <Edit3 class="mr-2 h-4 w-4" />
                        编辑
                      </DropdownMenuItem>
                      <DropdownMenuItem @click="removeRule(rule.id)" class="text-destructive">
                        <Trash2 class="mr-2 h-4 w-4" />
                        删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <!-- 空状态 -->
          <div v-if="filteredRules.length === 0" class="text-center py-12">
            <Globe class="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 class="text-lg font-medium text-foreground mb-2">
              {{ searchQuery ? '未找到匹配的规则' : '暂无网站规则' }}
            </h3>
            <p class="text-muted-foreground mb-4">
              {{ searchQuery ? '试试其他搜索关键词' : '开始添加网站规则来管理翻译行为' }}
            </p>
            <button
              v-if="!searchQuery"
              @click="showAddDialog = true"
              class="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              <Plus class="w-4 h-4" />
              添加第一个规则
            </button>
          </div>
        </div>

        <!-- 统计信息 -->
        <div class="text-sm text-muted-foreground">
          共 {{ allRules.length }} 个网站规则
          <span v-if="searchQuery || filterType !== 'all'">
            ，显示 {{ filteredRules.length }} 个匹配结果
          </span>
          <span class="ml-4">
            黑名单: {{ blacklistCount }} | 白名单: {{ whitelistCount }}
          </span>
        </div>

        <!-- 添加/编辑对话框 -->
        <WebsiteRuleDialog
          v-if="showAddDialog"
          :rule="editingRule"
          :is-editing="!!editingRule"
          @save="handleSaveRule"
          @cancel="handleCancelEdit"
        />
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import {
  Search,
  Plus,
  Trash2,
  Shield,
  Heart,
  Edit3,
  Globe,
} from 'lucide-vue-next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { WebsiteManager } from '@/src/modules/options/website-management/manager';
import { WebsiteRule } from '@/src/modules/options/website-management/types';
import WebsiteRuleDialog from './WebsiteRuleDialog.vue';

const manager = new WebsiteManager();

// 响应式数据
const allRules = ref<WebsiteRule[]>([]);
const searchQuery = ref('');
const filterType = ref<'all' | 'blacklist' | 'whitelist'>('all');
const selectedRules = ref<string[]>([]);
const selectAll = ref(false);
const showAddDialog = ref(false);
const editingRule = ref<WebsiteRule | null>(null);

// 计算属性
const blacklistCount = computed(() => {
  return allRules.value.filter(rule => rule.type === 'blacklist').length;
});

const whitelistCount = computed(() => {
  return allRules.value.filter(rule => rule.type === 'whitelist').length;
});

const filteredRules = computed(() => {
  let rules = allRules.value;

  // 按类型筛选
  if (filterType.value !== 'all') {
    rules = rules.filter(rule => rule.type === filterType.value);
  }

  // 按搜索关键词筛选
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    rules = rules.filter(rule => 
      rule.pattern.toLowerCase().includes(query) ||
      rule.description?.toLowerCase().includes(query)
    );
  }

  return rules;
});

// 生命周期
onMounted(async () => {
  await loadRules();
});

// 方法
const loadRules = async () => {
  try {
    allRules.value = await manager.getRules();
  } catch (error) {
    console.error('加载规则失败:', error);
  }
};

const handleSelectAll = () => {
  if (selectAll.value) {
    selectedRules.value = filteredRules.value.map(rule => rule.id);
  } else {
    selectedRules.value = [];
  }
};

const editRule = (rule: WebsiteRule) => {
  editingRule.value = rule;
  showAddDialog.value = true;
};

const handleSaveRule = async (ruleData: Omit<WebsiteRule, 'id' | 'createdAt'>) => {
  try {
    if (editingRule.value) {
      // 编辑现有规则
      await manager.updateRule(editingRule.value.id, ruleData);
    } else {
      // 添加新规则
      await manager.addRule(ruleData.pattern, ruleData.type, ruleData.description);
    }
    
    await loadRules();
    handleCancelEdit();
  } catch (error) {
    console.error('保存规则失败:', error);
  }
};

const handleCancelEdit = () => {
  showAddDialog.value = false;
  editingRule.value = null;
};

const removeRule = async (id: string) => {
  if (confirm('确定要删除这个规则吗？')) {
    try {
      await manager.removeRule(id);
      await loadRules();
      selectedRules.value = selectedRules.value.filter(ruleId => ruleId !== id);
    } catch (error) {
      console.error('删除规则失败:', error);
    }
  }
};

const bulkDeleteRules = async () => {
  if (confirm(`确定要删除选中的 ${selectedRules.value.length} 个规则吗？`)) {
    try {
      await manager.removeRules(selectedRules.value);
      await loadRules();
      selectedRules.value = [];
      selectAll.value = false;
    } catch (error) {
      console.error('批量删除规则失败:', error);
    }
  }
};

const toggleRule = async (id: string) => {
  try {
    await manager.toggleRule(id);
    await loadRules();
  } catch (error) {
    console.error('切换规则状态失败:', error);
  }
};



const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    // 这里可以添加一个toast提示
    console.log('已复制到剪贴板:', text);
  } catch (error) {
    console.error('复制失败:', error);
    // 降级方案
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
};
</script> 