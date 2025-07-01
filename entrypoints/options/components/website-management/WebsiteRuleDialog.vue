<template>
  <!-- 遮罩层 -->
  <div
    class="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
  >
    <!-- 对话框 -->
    <div
      class="bg-card border border-border rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto"
      @click.stop
    >
      <!-- 标题栏 -->
      <div class="flex items-center justify-between p-6 border-b border-border">
        <h3 class="text-lg font-semibold text-foreground">
          {{ isEditing ? '编辑网站规则' : '添加网站规则' }}
        </h3>
        <button
          @click="handleCancel"
          class="text-muted-foreground hover:text-foreground transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- 内容 -->
      <div class="p-6 space-y-6">
        <!-- 规则类型选择 -->
        <RuleTypeSelector v-model="formData.type" />

        <!-- 网站模式输入 -->
        <div class="space-y-2">
          <label class="text-sm font-medium text-foreground">
            网站模式
            <span class="text-destructive">*</span>
          </label>
          <input
            v-model="formData.pattern"
            @keyup.enter="handleSave"
            type="text"
            placeholder="例如: *://github.com/*"
            class="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            :class="{ 'border-destructive': patternError }"
            ref="patternInput"
          />
          <div v-if="patternError" class="text-sm text-destructive">
            {{ patternError }}
          </div>
        </div>

        <!-- 描述输入 -->
        <div class="space-y-2">
          <label class="text-sm font-medium text-foreground">
            描述（可选）
          </label>
          <textarea
            v-model="formData.description"
            rows="2"
            placeholder="为这个规则添加一些说明..."
            class="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
          />
        </div>

        <!-- 帮助信息 -->
        <div class="bg-muted/50 rounded-md p-4 space-y-3">
          <div class="text-sm font-medium text-foreground">支持的模式：</div>
          <div class="text-xs text-muted-foreground space-y-1">
            <div>
              <code class="px-1.5 py-0.5 rounded bg-background">
                *://example.com/*
              </code>
              - 整个域名
            </div>
            <div>
              <code class="px-1.5 py-0.5 rounded bg-background">
                https://example.com/path/*
              </code>
              - 特定路径
            </div>
            <div>
              <code class="px-1.5 py-0.5 rounded bg-background">
                *://*.example.com/*
              </code>
              - 包含子域名
            </div>
            <div>
              <code class="px-1.5 py-0.5 rounded bg-background">file:///*</code>
              - 本地文件
            </div>
          </div>
        </div>

        <!-- 预设模板 -->
        <div class="space-y-3">
          <label class="text-sm font-medium text-foreground">常用模板：</label>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <button
              v-for="preset in getPresets()"
              :key="preset.pattern"
              @click="applyPreset(preset.pattern)"
              class="text-left p-3 border border-border rounded text-xs hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              <div class="font-medium flex items-center gap-2">
                <component :is="getPresetIcon(preset.type)" class="w-3 h-3" />
                {{ preset.name }}
              </div>
              <div class="text-muted-foreground font-mono mt-1">
                {{ preset.pattern }}
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div
        class="flex items-center justify-end gap-2 p-6 border-t border-border"
      >
        <button
          @click="handleCancel"
          class="px-4 py-2 border border-border rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          取消
        </button>
        <button
          @click="handleSave"
          :disabled="!isFormValid"
          class="px-4 py-2 rounded-md transition-colors"
          :class="[
            formData.type === 'blacklist'
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white',
            !isFormValid && 'opacity-50 cursor-not-allowed',
          ]"
        >
          {{ isEditing ? '更新' : '添加' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import { X, Shield, Heart } from 'lucide-vue-next';
import { WebsiteRule } from '@/src/modules/options/website-management/types';
import RuleTypeSelector from './RuleTypeSelector.vue';

interface Props {
  rule?: WebsiteRule | null;
  isEditing: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  save: [rule: Omit<WebsiteRule, 'id' | 'createdAt'>];
  cancel: [];
}>();

const patternInput = ref<HTMLInputElement>();
const patternError = ref('');

const formData = reactive({
  pattern: '',
  type: 'blacklist' as 'blacklist' | 'whitelist',
  description: '',
});

const presets = [
  // 黑名单预设
  { name: 'GitHub', pattern: '*://github.com/*', type: 'blacklist' },
  {
    name: 'Stack Overflow',
    pattern: '*://stackoverflow.com/*',
    type: 'blacklist',
  },
  { name: 'MDN', pattern: '*://developer.mozilla.org/*', type: 'blacklist' },
  { name: 'Google Docs', pattern: '*://docs.google.com/*', type: 'blacklist' },

  // 白名单预设
  { name: 'Wikipedia', pattern: '*://*.wikipedia.org/*', type: 'whitelist' },
  { name: 'Reddit', pattern: '*://reddit.com/*', type: 'whitelist' },
  { name: 'Medium', pattern: '*://medium.com/*', type: 'whitelist' },
  { name: 'BBC News', pattern: '*://www.bbc.com/*', type: 'whitelist' },
];

onMounted(async () => {
  if (props.rule) {
    formData.pattern = props.rule.pattern;
    formData.type = props.rule.type;
    formData.description = props.rule.description || '';
  }

  await nextTick();
  patternInput.value?.focus();
});

const isFormValid = computed(() => {
  return formData.pattern.trim() !== '' && !patternError.value;
});

const getPresets = () => {
  return presets.filter((preset) => preset.type === formData.type);
};

const getPresetIcon = (type: string) => {
  return type === 'blacklist' ? Shield : Heart;
};

const validatePattern = (pattern: string): boolean => {
  patternError.value = '';

  if (!pattern.trim()) {
    patternError.value = '请输入网站模式';
    return false;
  }

  // 基本的URL模式验证
  const validPatterns = [
    /^\*:\/\/.*/, // *://domain
    /^https?:\/\/.*/, // http://domain or https://domain
    /^file:\/\/.*/, // file://path
  ];

  const isValid = validPatterns.some((regex) => regex.test(pattern));

  if (!isValid) {
    patternError.value = '请输入有效的URL模式';
    return false;
  }

  return true;
};

const applyPreset = (pattern: string) => {
  formData.pattern = pattern;
  validatePattern(pattern);
};

const handleSave = () => {
  if (!validatePattern(formData.pattern)) {
    return;
  }

  const ruleData: Omit<WebsiteRule, 'id' | 'createdAt'> = {
    pattern: formData.pattern.trim(),
    type: formData.type,
    description: formData.description.trim() || undefined,
    enabled: true,
  };

  emit('save', ruleData);
};

const handleCancel = () => {
  emit('cancel');
};
</script>
