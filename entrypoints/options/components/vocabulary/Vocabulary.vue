<template>
  <div class="mx-auto space-y-6">
    <!-- 页面标题和统计信息 -->
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 class="text-2xl font-bold text-foreground">
            {{ $t('vocabulary.title') }}
          </h2>
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="space-y-2">
          <p class="text-muted-foreground">
            {{ $t('vocabulary.description') }}
          </p>
        </div>

        <!-- 统计卡片 -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="bg-muted/30 rounded-lg p-4">
            <div class="text-sm text-muted-foreground mb-1">
              {{ $t('vocabulary.stats.totalWords') }}
            </div>
            <div class="text-2xl font-bold text-foreground">
              {{ stats.totalWords }}
            </div>
          </div>
          <div class="bg-muted/30 rounded-lg p-4">
            <div class="text-sm text-muted-foreground mb-1">
              {{ $t('vocabulary.stats.favoriteWords') }}
            </div>
            <div class="text-2xl font-bold text-primary">
              {{ stats.favoriteWords }}
            </div>
          </div>
          <div class="bg-muted/30 rounded-lg p-4">
            <div class="text-sm text-muted-foreground mb-1">
              {{ $t('vocabulary.stats.totalTranslations') }}
            </div>
            <div class="text-2xl font-bold text-foreground">
              {{ stats.totalTranslations }}
            </div>
          </div>
          <div class="bg-muted/30 rounded-lg p-4">
            <div class="text-sm text-muted-foreground mb-1">
              {{ $t('vocabulary.stats.todayTranslations') }}
            </div>
            <div class="text-2xl font-bold text-foreground">
              {{ stats.todayTranslations }}
            </div>
          </div>
        </div>

        <!-- 操作工具栏 -->
        <div class="bg-card rounded-lg border border-border p-4">
          <div
            class="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between"
          >
            <!-- 左侧：搜索和筛选 -->
            <div class="flex flex-col sm:flex-row gap-3 flex-1">
              <!-- 搜索框 -->
              <div class="relative flex-1 max-w-md">
                <Search
                  class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground"
                />
                <input
                  v-model="searchQuery"
                  type="text"
                  :placeholder="$t('vocabulary.searchPlaceholder')"
                  class="w-full pl-10 pr-4 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  @input="handleSearch"
                />
              </div>

              <!-- 类型筛选 -->
              <div class="flex gap-2">
                <button
                  @click="filterFavorites = false"
                  :class="[
                    'px-3 py-2 rounded-md text-sm transition-colors',
                    !filterFavorites
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border hover:bg-accent hover:text-accent-foreground',
                  ]"
                >
                  {{ $t('vocabulary.filterAll') }}
                </button>
                <button
                  @click="filterFavorites = true"
                  :class="[
                    'px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-1',
                    filterFavorites
                      ? 'bg-yellow-500 text-white'
                      : 'border border-border hover:bg-accent hover:text-accent-foreground',
                  ]"
                >
                  <Star class="w-3 h-3" />
                  {{ $t('vocabulary.filterFavorites') }} ({{ stats.favoriteWords }})
                </button>
              </div>
            </div>

            <!-- 右侧：排序和操作按钮 -->
            <div class="flex gap-2 flex-wrap">
              <!-- 排序选择 -->
              <Select v-model="sortBy" @update:model-value="handleSort">
                <SelectTrigger class="w-40">
                  <SelectValue :placeholder="$t('vocabulary.sortBy')" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lastTranslatedAt">
                    {{ $t('vocabulary.sortByRecent') }}
                  </SelectItem>
                  <SelectItem value="firstTranslatedAt">
                    {{ $t('vocabulary.sortByOldest') }}
                  </SelectItem>
                  <SelectItem value="frequency">
                    {{ $t('vocabulary.sortByFrequency') }}
                  </SelectItem>
                  <SelectItem value="word">
                    {{ $t('vocabulary.sortByWord') }}
                  </SelectItem>
                </SelectContent>
              </Select>

              <!-- 导出按钮 -->
              <DropdownMenu>
                <DropdownMenuTrigger as-child>
                  <Button variant="default" class="flex items-center gap-2">
                    <Download class="w-4 h-4" />
                    {{ $t('vocabulary.export') }}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem @click="exportData('txt')">
                    <FileText class="mr-2 h-4 w-4" />
                    {{ $t('vocabulary.exportAsTxt') }}
                  </DropdownMenuItem>
                  <DropdownMenuItem @click="exportData('csv')">
                    <FileSpreadsheet class="mr-2 h-4 w-4" />
                    {{ $t('vocabulary.exportAsCsv') }}
                  </DropdownMenuItem>
                  <DropdownMenuItem @click="exportData('json')">
                    <FileJson class="mr-2 h-4 w-4" />
                    {{ $t('vocabulary.exportAsJson') }}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <!-- 清空数据按钮 -->
              <Button
                variant="destructive"
                @click="clearAllData"
                class="flex items-center gap-2"
              >
                <Trash2 class="w-4 h-4" />
                {{ $t('vocabulary.clearAll') }}
              </Button>
            </div>
          </div>
        </div>

        <!-- 生词列表 -->
        <div class="bg-card rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead class="w-12">
                  <Star class="w-4 h-4 text-muted-foreground" />
                </TableHead>
                <TableHead class="w-48">
                  {{ $t('vocabulary.tableWord') }}
                </TableHead>
                <TableHead class="w-16">
                  {{ $t('vocabulary.tablePhonetic') }}
                </TableHead>
                <TableHead class="flex-1">
                  {{ $t('vocabulary.tableTranslation') }}
                </TableHead>
                <TableHead class="w-20">
                  {{ $t('vocabulary.tableFrequency') }}
                </TableHead>
                <TableHead class="w-32">
                  {{ $t('vocabulary.tableLastTranslated') }}
                </TableHead>
                <TableHead class="w-12 text-right">
                  {{ $t('vocabulary.tableActions') }}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="entry in paginatedEntries"
                :key="entry.id"
                class="hover:bg-muted/25"
              >
                <TableCell>
                  <button
                    @click="toggleFavorite(entry.word)"
                    class="p-1 rounded hover:bg-muted/50 transition-colors"
                  >
                    <Star
                      :class="[
                        'w-4 h-4',
                        entry.isFavorite
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-muted-foreground',
                      ]"
                    />
                  </button>
                </TableCell>
                <TableCell>
                  <div class="font-medium text-foreground">
                    {{ entry.originalWord }}
                  </div>
                </TableCell>
                <TableCell>
                  <span v-if="entry.phonetic" class="text-sm text-muted-foreground">
                    {{ entry.phonetic }}
                  </span>
                  <span v-else class="text-sm text-muted-foreground/50">
                    -
                  </span>
                </TableCell>
                <TableCell>
                  <div class="text-sm text-muted-foreground line-clamp-2">
                    {{ entry.translation }}
                  </div>
                </TableCell>
                <TableCell>
                  <span class="inline-flex items-center px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                    {{ entry.frequency }}
                  </span>
                </TableCell>
                <TableCell>
                  <span class="text-xs text-muted-foreground">
                    {{ formatDate(entry.lastTranslatedAt) }}
                  </span>
                </TableCell>
                <TableCell class="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                      <Button variant="ghost" class="h-8 w-8 p-0">
                        <span class="sr-only">
                          {{ $t('vocabulary.openMenu') }}
                        </span>
                        <svg
                          class="h-4 w-4"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"
                          />
                        </svg>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem @click="toggleFavorite(entry.word)">
                        <Star
                          :class="[
                            'mr-2 h-4 w-4',
                            entry.isFavorite ? 'fill-yellow-400' : '',
                          ]"
                        />
                        {{
                          entry.isFavorite
                            ? $t('vocabulary.unfavorite')
                            : $t('vocabulary.favorite')
                        }}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        @click="deleteEntry(entry.word)"
                        class="text-destructive"
                      >
                        <Trash2 class="mr-2 h-4 w-4" />
                        {{ $t('vocabulary.delete') }}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <!-- 空状态 -->
          <div
            v-if="filteredEntries.length === 0"
            class="text-center py-12"
          >
            <BookOpen class="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 class="text-lg font-medium text-foreground mb-2">
              {{
                searchQuery
                  ? $t('vocabulary.noMatchingWords')
                  : $t('vocabulary.noWords')
              }}
            </h3>
            <p class="text-muted-foreground">
              {{
                searchQuery
                  ? $t('vocabulary.tryOtherKeywords')
                  : $t('vocabulary.startLearning')
              }}
            </p>
          </div>
        </div>

        <!-- 分页 -->
        <div
          v-if="filteredEntries.length > 0"
          class="flex items-center justify-between"
        >
          <div class="text-sm text-muted-foreground">
            {{ $t('vocabulary.showingEntries', { from: paginationFrom, to: paginationTo, total: total }) }}
          </div>
          <div class="flex gap-2">
            <Button
              variant="ghost"
              :disabled="isPrevDisabled"
              @click="prevPage"
              class="flex items-center gap-1"
            >
              <ChevronLeft class="w-4 h-4" />
              {{ $t('vocabulary.prev') }}
            </Button>
            <Button
              variant="ghost"
              :disabled="isNextDisabled"
              @click="nextPage"
              class="flex items-center gap-1"
            >
              {{ $t('vocabulary.next') }}
              <ChevronRight class="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  Search,
  Star,
  Download,
  Trash2,
  BookOpen,
  FileText,
  FileSpreadsheet,
  FileJson,
  ChevronLeft,
  ChevronRight,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { vocabularyService } from '@/src/modules/core/vocabulary';
import {
  VocabularyEntry,
  VocabularyStats,
  ExportFormat,
  VocabularyQueryOptions,
} from '@/src/modules/shared/types/vocabulary';

const { t } = useI18n();

// 响应式数据
const allEntries = ref<VocabularyEntry[]>([]);
const searchQuery = ref('');
const filterFavorites = ref(false);
const sortBy = ref<'lastTranslatedAt' | 'firstTranslatedAt' | 'frequency' | 'word'>('lastTranslatedAt');
const sortOrder = ref<'asc' | 'desc'>('desc');
const offset = ref(0);
const pageSize = ref(20);
const stats = ref<VocabularyStats>({
  totalWords: 0,
  favoriteWords: 0,
  totalTranslations: 0,
  todayTranslations: 0,
  weekTranslations: 0,
  firstTranslationDate: null,
  lastTranslationDate: null,
});

// 计算属性
const filteredEntries = computed(() => {
  let entries = [...allEntries.value];

  // 按收藏筛选
  if (filterFavorites.value) {
    entries = entries.filter((entry) => entry.isFavorite);
  }

  // 按搜索关键词筛选
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    entries = entries.filter(
      (entry) =>
        entry.word.toLowerCase().includes(query) ||
        entry.translation.toLowerCase().includes(query) ||
        entry.originalWord.toLowerCase().includes(query),
    );
  }

  // 排序
  entries.sort((a, b) => {
    let comparison: number;
    const key = sortBy.value;

    if (key === 'frequency') {
      comparison = a.frequency - b.frequency;
    } else if (key === 'word') {
      comparison = a.word.localeCompare(b.word);
    } else if (key === 'firstTranslatedAt') {
      comparison = a.firstTranslatedAt - b.firstTranslatedAt;
    } else {
      // lastTranslatedAt
      comparison = a.lastTranslatedAt - b.lastTranslatedAt;
    }

    return sortOrder.value === 'asc' ? comparison : -comparison;
  });

  return entries;
});

const paginatedEntries = computed(() => {
  return filteredEntries.value.slice(offset.value, offset.value + pageSize.value);
});

const total = computed(() => filteredEntries.value.length);

const paginationFrom = computed(() => offset.value + 1);

const paginationTo = computed(() => {
  return Math.min(offset.value + pageSize.value, total.value);
});

const isPrevDisabled = computed(() => offset.value === 0);

const isNextDisabled = computed(() => {
  return offset.value + pageSize.value >= total.value;
});

// 生命周期
onMounted(async () => {
  await loadData();
});

// 监听筛选变化，重置分页
watch([filterFavorites, sortBy, searchQuery], () => {
  offset.value = 0;
});

// 方法
const loadData = async () => {
  try {
    const queryOptions: VocabularyQueryOptions = {
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
    };

    const result = await vocabularyService.query(queryOptions);
    allEntries.value = result.entries;

    const statsResult = await vocabularyService.getStats();
    stats.value = statsResult;
  } catch (error) {
    console.error('Failed to load vocabulary data:', error);
  }
};

const handleSearch = () => {
  offset.value = 0;
};

const handleSort = () => {
  offset.value = 0;
};

const toggleFavorite = async (word: string) => {
  try {
    await vocabularyService.toggleFavorite(word);
    await loadData();
  } catch (error) {
    console.error('Failed to toggle favorite:', error);
  }
};

const deleteEntry = async (word: string) => {
  if (confirm(t('vocabulary.confirmDelete'))) {
    try {
      await vocabularyService.deleteEntry(word);
      await loadData();
    } catch (error) {
      console.error('Failed to delete entry:', error);
    }
  }
};

const clearAllData = async () => {
  if (confirm(t('vocabulary.confirmClearAll'))) {
    try {
      await vocabularyService.clearAllData();
      await loadData();
    } catch (error) {
      console.error('Failed to clear data:', error);
    }
  }
};

const exportData = async (format: string) => {
  try {
    const exportFormat = format as ExportFormat;
    const content = await vocabularyService.exportData({
      format: exportFormat,
      includePhonetic: true,
      includeFrequency: true,
      includeTimestamps: true,
      favoritesOnly: filterFavorites.value,
    });

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `illa-helper-vocabulary-${timestamp}.${format}`;

    let mimeType = 'text/plain';
    if (format === 'csv') {
      mimeType = 'text/csv';
    } else if (format === 'json') {
      mimeType = 'application/json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export data:', error);
  }
};

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // 今天
    return t('time.justNow');
  } else if (diffDays === 1) {
    return t('time.daysAgo', { days: 1 });
  } else if (diffDays < 7) {
    return t('time.daysAgo', { days: diffDays });
  } else {
    return date.toLocaleDateString('zh-CN');
  }
};

const prevPage = () => {
  offset.value = Math.max(0, offset.value - pageSize.value);
};

const nextPage = () => {
  offset.value = Math.min(
    total.value - pageSize.value,
    offset.value + pageSize.value,
  );
};
</script>
