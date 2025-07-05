/**
 * 基础样式
 * 包含翻译元素的基础样式定义，基于原始样式重建
 */

export const BASE_STYLES = `
/* 基础样式 */
.wxt-word-container {
  display: inline;
  position: relative;
}

.wxt-chinese {
  display: inline;
}

.wxt-original-word {
  background: linear-gradient(to right, var(--wxt-primary-color) 0%, var(--wxt-primary-color) 50%, transparent 50%, transparent 100%) repeat-x left bottom;
  background-size: 8px 2px;
  padding-bottom: 2px;
}

.wxt-english {
  display: inline;
  margin-left: 4px;
  font-size: 0.9em;
  vertical-align: baseline;
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

/* 短语翻译双层交互样式 */
.wxt-has-word-overlay {
  position: relative !important;
}

.wxt-word-hover-area {
  position: absolute;
  pointer-events: auto;
  z-index: 1;
  background: transparent;
  cursor: pointer;
  transition: background-color 0.2s ease;
  border-radius: 2px;
}

.wxt-word-hover-area:hover {
  background-color: rgba(106, 136, 224, 0.1) !important;
}

.wxt-word-hover-area.wxt-pronunciation-enabled:hover {
  background-color: rgba(106, 136, 224, 0.15) !important;
}

/* 处理状态样式 */
.wxt-processing {
  pointer-events: none;
}


/* 错误状态样式 */
.wxt-error {
  color: #ff6b6b !important;
  text-decoration: line-through;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .wxt-word-container {
    font-size: 14px;
  }

  .wxt-english {
    font-size: 0.85em;
  }
}

/* 动画定义 */
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* ===== 翻译状态控制系统 ===== */

/**
 * 全局翻译状态控制
 *
 * 原理：通过在 body 上添加/移除 CSS 类来控制所有翻译内容的显示状态
 * 优势：
 * - 高性能：避免逐个元素操作
 * - 自动继承：新添加的翻译内容自动应用当前状态
 * - 统一管理：所有翻译内容状态保持一致
 */
.wxt-translation-hidden .wxt-translation-term {
  display: none !important;
}

/**
 * 状态切换过渡效果
 * 为翻译内容的显示/隐藏提供平滑的视觉过渡
 */
.wxt-translation-term {
  transition: opacity 0.2s ease-in-out;
}
`;
