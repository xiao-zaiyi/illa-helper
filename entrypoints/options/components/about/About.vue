<template>
  <div class="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 class="text-2xl font-bold text-foreground">
            关于 浸入式学语言助手 (illa-helper)
          </h2>
        </CardTitle>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="flex items-center space-x-4">
          <img
            src="/assets/logo.png"
            alt="浸入式学语言助手 illa-helper Logo"
            class="w-16 h-16"
          />
          <div>
            <h3 class="text-lg font-semibold">
              浸入式学语言助手 (illa-helper)
            </h3>
            <p class="text-sm text-muted-foreground">
              版本 {{ extensionVersion }}
            </p>
          </div>
        </div>
        <div class="prose prose-sm max-w-none text-foreground">
          <p>
            浸入式学语言助手 (illa-helper) 是一款基于 'i+1'
            可理解输入理论的浏览器扩展，旨在通过沉浸式翻译和发音学习生态系统，帮助您在日常浏览中轻松、高效地学习外语。
          </p>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>
          <h2 class="text-xl font-bold text-foreground">核心功能</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul class="list-disc space-y-2 pl-5 text-sm text-foreground">
          <li>
            <strong>智能翻译与词汇替换:</strong>
            支持超过20种语言，并根据您的水平智能选择词汇。
          </li>
          <li>
            <strong>发音学习生态系统:</strong>
            集成音标、AI词义解释和双TTS语音朗读，提供一站式发音学习体验。
          </li>
          <li>
            <strong>多种学习风格:</strong>
            提供7种不同的翻译样式（如下划线、高亮、模糊等），满足个性化学习需求。
          </li>
          <li>
            <strong>交互式悬浮框:</strong>
            鼠标悬停即可查看单词和短语的详细发音与释义，支持嵌套查询。
          </li>
        </ul>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>
          <h2 class="text-xl font-bold text-foreground">支持与反馈</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p class="text-sm text-muted-foreground">
          您的支持是我们不断改进的动力！如果觉得这个扩展有用，欢迎在 GitHub
          上给我们一颗星，或参与到开发中来。
        </p>
        <div class="mt-4 flex flex-wrap gap-2">
          <a href="https://github.com/xiao-zaiyi/illa-helper" target="_blank">
            <Button>⭐ Star on GitHub</Button>
          </a>
          <a
            href="https://github.com/xiao-zaiyi/illa-helper/issues"
            target="_blank"
          >
            <Button variant="outline">报告问题</Button>
          </a>
          <a
            href="https://github.com/xiao-zaiyi/illa-helper/pulls"
            target="_blank"
          >
            <Button variant="outline">参与贡献</Button>
          </a>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const extensionVersion = ref('N/A');

onMounted(() => {
  // 在浏览器扩展中，我们可以通过 browser.runtime.getManifest() 获取 manifest.json 的内容
  try {
    const manifest = browser.runtime.getManifest();
    extensionVersion.value = manifest.version;
  } catch (error) {
    console.error('无法获取扩展版本号:', error);
    // 在非扩展环境或开发服务器中，这可能会失败。可以设置一个默认值。
    extensionVersion.value = 'DEV';
  }
});
</script>
