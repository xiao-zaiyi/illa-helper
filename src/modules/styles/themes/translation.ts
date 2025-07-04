/**
 * 翻译样式主题
 * 包含不同的翻译样式定义
 */

export const TRANSLATION_STYLES = `
/* 默认样式 */
.wxt-style-default {
  color: var(--wxt-primary-color);
  font-weight: 500;
}

/* 微妙样式 */
.wxt-style-subtle {
  color: var(--wxt-label-color);
  opacity: 0.9;
}

/* 粗体样式 */
.wxt-style-bold {
  color: var(--wxt-primary-color);
  font-weight: bold;
}

/* 斜体样式 */
.wxt-style-italic {
  color: var(--wxt-primary-color);
  font-style: italic;
}

/* 下划线样式 */
.wxt-style-underlined {
  color: var(--wxt-primary-color);
  text-decoration: none;
  padding-bottom: 1px;
  border-bottom: 2px solid var(--wxt-accent-color);
}

/* 高亮样式 */
.wxt-style-highlighted {
  color: #212529;
  background-color: #ffeb3b;
  padding: 0 2px;
  border-radius: 2px;
}

/* 点画线样式 */
.wxt-style-dotted {
  background: linear-gradient(to right, #57bcb8 0%, #59c1bf 50%, transparent 50%, transparent 100%) repeat-x left bottom;
  background-size: 8px 2px;
  padding-bottom: 2px;
}

.wxt-style-dotted:hover {
  border-color: var(--wxt-primary-color);
}

/* 学习模式样式 */
.wxt-translation-term--learning {
  filter: blur(5px);
  cursor: pointer;
  color: var(--wxt-primary-color);
  transition: filter 0.2s ease-in-out;
}

.wxt-translation-term--learning:hover {
  filter: blur(0);
}

/* 学习模式原文样式 - 全面增强悬停支持 */
.wxt-original-word--learning {
  filter: blur(5px);
  cursor: pointer;
  transition: filter 0.2s ease-in-out;
}

.wxt-original-word--learning:hover {
  filter: blur(0) !important;
}

/* 增强a标签内学习模式的悬停支持 */
a .wxt-original-word--learning:hover,
a:hover .wxt-original-word--learning {
  filter: blur(0) !important;
}
`;
