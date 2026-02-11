/**
 * 工具提示样式
 * 重新设计：OLED Dark + Glassmorphism + Shimmer Loading
 * 视觉层级：单词 > 音标 > 词义，清晰分离
 */

export const TOOLTIP_STYLES = `
/* ===== 动画定义 ===== */
@keyframes wxt-tooltip-appear {
  from {
    opacity: 0;
    transform: translateY(6px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes wxt-tooltip-appear-top {
  from {
    opacity: 0;
    transform: translateY(-6px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes wxt-word-tooltip-appear {
  from {
    opacity: 0;
    transform: translateY(4px) scale(0.94);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes wxt-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes wxt-spin {
  to { transform: rotate(360deg); }
}

@keyframes wxt-pulse-glow {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}

/* ===== 减少动画偏好 ===== */
@media (prefers-reduced-motion: reduce) {
  .wxt-pronunciation-tooltip,
  .wxt-word-tooltip,
  .wxt-interactive-word,
  .wxt-audio-btn,
  .wxt-accent-audio-btn {
    animation: none !important;
    transition: none !important;
  }
}

/* ===== 主悬浮框容器 ===== */
.wxt-pronunciation-tooltip {
  position: fixed;
  z-index: 10000;
  pointer-events: auto;
  animation: wxt-tooltip-appear 0.2s cubic-bezier(0.2, 0.6, 0.35, 1) forwards;
}

/* ===== 卡片主体 ===== */
.wxt-tooltip-card {
  background: rgba(22, 22, 24, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  box-shadow:
    0 24px 48px -12px rgba(0, 0, 0, 0.5),
    0 0 0 0.5px rgba(255, 255, 255, 0.06);
  padding: 0;
  min-width: 230px;
  max-width: 310px;
  color: #f5f5f7;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
  position: relative;
  overflow: hidden;
  -webkit-backdrop-filter: blur(40px) saturate(180%);
  backdrop-filter: blur(40px) saturate(180%);
}

/* 顶部高光线 */
.wxt-tooltip-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 20%;
  right: 20%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(100, 255, 218, 0.2), transparent);
  z-index: 1;
}

/* ===== Header 区域 ===== */
.wxt-tooltip-header {
  padding: 14px 16px 12px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  position: relative;
}

.wxt-phrase-tooltip-header {
  align-items: flex-start;
  gap: 12px;
}

/* Header 底部分隔线 */
.wxt-tooltip-header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 14px;
  right: 14px;
  height: 1px;
  background: rgba(255, 255, 255, 0.06);
}

/* ===== Body 区域 ===== */
.wxt-tooltip-body {
  font-size: 12px;
}

.wxt-phrase-tooltip-body {
  padding: 10px 14px 14px;
}

/* ===== 单词信息 ===== */
.wxt-word-info {
  flex: 1;
  min-width: 0;
}

.wxt-word-main {
  font-size: 17px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 0;
  word-break: break-word;
  letter-spacing: -0.025em;
  line-height: 1.25;
}

/* ===== 音标区域 ===== */
.wxt-phonetic-row {
  margin-top: 8px;
}

.wxt-phonetic-text {
  font-family: 'SF Mono', 'Menlo', 'Consolas', 'Roboto Mono', monospace;
  font-size: 13px;
  color: #64ffda;
  font-style: normal;
  font-weight: 500;
  background: rgba(100, 255, 218, 0.08);
  padding: 3px 10px;
  border-radius: 6px;
  display: inline-block;
  border: 1px solid rgba(100, 255, 218, 0.15);
  letter-spacing: 0.03em;
}

.wxt-phonetic-error {
  font-family: 'SF Mono', 'Menlo', 'Consolas', 'Roboto Mono', monospace;
  font-size: 12px;
  color: #ff6b6b;
  font-style: italic;
  font-weight: 400;
  background: rgba(255, 107, 107, 0.08);
  padding: 3px 10px;
  border-radius: 6px;
  display: inline-block;
  border: 1px solid rgba(255, 107, 107, 0.12);
  letter-spacing: 0.01em;
}

/* ===== 音标加载 - Shimmer ===== */
.wxt-phonetic-loading {
  height: 22px;
  width: 100px;
  border-radius: 6px;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.04) 25%,
    rgba(255, 255, 255, 0.08) 50%,
    rgba(255, 255, 255, 0.04) 75%
  );
  background-size: 200% 100%;
  animation: wxt-shimmer 1.5s ease-in-out infinite;
  display: block;
  font-size: 0;
  color: transparent;
  overflow: hidden;
}

.wxt-phonetic-loading::after {
  display: none;
}

/* ===== 词义区域 ===== */
.wxt-meaning-container {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  min-height: 24px;
}

.wxt-meaning-text {
  font-size: 13px;
  color: #d1d1d6;
  line-height: 1.55;
  padding: 0;
  margin: 0;
  font-style: normal;
  background: none;
  border: none;
}

/* ===== 词义加载 - Shimmer ===== */
.wxt-meaning-loading {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  font-size: 0;
  color: transparent;
  overflow: hidden;
}

.wxt-meaning-loading::before {
  content: '';
  display: block;
  height: 12px;
  width: 100%;
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.04) 25%,
    rgba(255, 255, 255, 0.08) 50%,
    rgba(255, 255, 255, 0.04) 75%
  );
  background-size: 200% 100%;
  animation: wxt-shimmer 1.5s ease-in-out infinite;
}

.wxt-meaning-loading::after {
  content: '';
  display: block;
  height: 12px;
  width: 65%;
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.04) 25%,
    rgba(255, 255, 255, 0.08) 50%,
    rgba(255, 255, 255, 0.04) 75%
  );
  background-size: 200% 100%;
  animation: wxt-shimmer 1.5s ease-in-out 0.15s infinite;
  border: none;
}

/* ===== 原文显示 ===== */
.wxt-original-text {
  font-size: 11px;
  color: #8e8e93;
  font-style: normal;
  margin: 4px 0 0 0;
  padding: 0;
  background: none;
  border: none;
  opacity: 1;
  letter-spacing: 0.01em;
}

.wxt-tooltip-header .wxt-original-text {
  margin: 4px 0 0 0;
  font-size: 11px;
  background: none;
  border: none;
  color: rgba(100, 255, 218, 0.6);
}

/* ===== 音频播放按钮 ===== */
.wxt-audio-btn {
  background: rgba(100, 255, 218, 0.12);
  border: 1px solid rgba(100, 255, 218, 0.2);
  border-radius: 10px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #64ffda;
  transition: all 0.2s cubic-bezier(0.2, 0.6, 0.35, 1);
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
  box-shadow: none;
}

.wxt-audio-btn::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(100, 255, 218, 0.15);
  opacity: 0;
  transition: opacity 0.15s ease;
  border-radius: inherit;
}

.wxt-audio-btn:hover {
  background: rgba(100, 255, 218, 0.18);
  border-color: rgba(100, 255, 218, 0.35);
  transform: scale(1.06);
}

.wxt-audio-btn:hover::before {
  opacity: 1;
}

.wxt-audio-btn:active {
  transform: scale(0.96);
  background: rgba(100, 255, 218, 0.25);
}

.wxt-audio-btn svg {
  width: 16px;
  height: 16px;
  position: relative;
  z-index: 1;
}

/* ===== 箭头指示器 ===== */
.wxt-tooltip-arrow {
  position: absolute;
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  width: 10px;
  height: 10px;
  background: rgba(22, 22, 24, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-top: none;
  border-left: none;
  -webkit-backdrop-filter: blur(40px);
  backdrop-filter: blur(40px);
}

.wxt-tooltip-arrow-top {
  bottom: auto;
  top: -5px;
  transform: translateX(-50%) rotate(-135deg);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-bottom: none;
  border-right: none;
}

/* ===== 短语悬浮框 ===== */
.wxt-phrase-info-card {
  flex: 1;
  min-width: 0;
}

.wxt-phrase-title {
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 0;
  line-height: 1.25;
  letter-spacing: -0.02em;
}

.wxt-phrase-original {
  font-size: 11px;
  color: rgba(100, 255, 218, 0.6);
  font-style: normal;
  margin-top: 4px;
  letter-spacing: 0.01em;
  display: block;
  padding: 0;
  background: none;
  border: none;
  box-shadow: none;
  opacity: 1;
}

.wxt-phrase-audio-btn {
  width: 32px !important;
  height: 32px !important;
  flex-shrink: 0;
  align-self: flex-start;
}

/* 按钮重置 */
.wxt-pronunciation-tooltip button {
  min-width: 20px !important;
  padding: 0 !important;
  margin: 0 !important;
}

.wxt-word-tooltip button {
  min-width: 20px !important;
  padding: 0 !important;
  margin: 0 !important;
}

/* ===== 短语单词列表 ===== */
.wxt-phrase-words {
  padding: 6px;
  font-size: 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  margin: 0;
  position: relative;
  min-height: 32px;
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  align-content: flex-start;
  gap: 4px;
}

.wxt-phrase-words::before {
  display: none;
}

.wxt-word-list {
  line-height: 1.6;
  padding: 3px 0;
  font-size: 11px;
}

.wxt-interactive-word {
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 8px;
  transition: all 0.15s cubic-bezier(0.2, 0.6, 0.35, 1);
  display: inline-block;
  margin: 0;
  color: #e5e5ea;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-weight: 500;
  font-size: 12px;
  line-height: 1.2;
  position: relative;
  overflow: hidden;
}

.wxt-interactive-word::before {
  display: none;
}

.wxt-interactive-word:hover {
  background: rgba(100, 255, 218, 0.12);
  color: #64ffda;
  transform: translateY(-1px);
  border-color: rgba(100, 255, 218, 0.25);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.wxt-interactive-word:active {
  transform: translateY(0);
  background: rgba(100, 255, 218, 0.18);
}

/* ===== 嵌套单词悬浮框 ===== */
.wxt-word-tooltip {
  position: fixed;
  z-index: 10001;
  visibility: hidden;
  opacity: 0;
  transition: opacity 0.15s ease, visibility 0.15s ease;
  pointer-events: auto;
  animation: wxt-word-tooltip-appear 0.18s cubic-bezier(0.2, 0.6, 0.35, 1);
}

.wxt-word-tooltip[data-show="true"] {
  visibility: visible;
  opacity: 1;
}

.wxt-word-tooltip-card {
  background: rgba(28, 28, 30, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 12px 14px;
  color: #f5f5f7;
  font-size: 12px;
  box-shadow:
    0 16px 32px -8px rgba(0, 0, 0, 0.45),
    0 0 0 0.5px rgba(255, 255, 255, 0.06);
  max-width: 220px;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
  position: relative;
  overflow: hidden;
  -webkit-backdrop-filter: blur(40px) saturate(180%);
  backdrop-filter: blur(40px) saturate(180%);
}

.wxt-word-tooltip-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 20%;
  right: 20%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(100, 255, 218, 0.15), transparent);
}

.wxt-word-tooltip-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.wxt-word-tooltip-header .wxt-word-info {
  flex: 1;
  min-width: 0;
}

.wxt-word-tooltip-header .wxt-word-main {
  font-weight: 700;
  font-size: 14px;
  color: #ffffff;
  letter-spacing: -0.02em;
  margin-bottom: 0;
}

.wxt-word-tooltip-header .wxt-phonetic-row {
  margin-top: 6px;
}

.wxt-phonetic-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.wxt-word-tooltip-header .wxt-phonetic-text {
  font-size: 12px;
  color: #64ffda;
  font-style: normal;
  font-weight: 500;
  background: rgba(100, 255, 218, 0.08);
  padding: 3px 8px;
  border-radius: 5px;
  border: 1px solid rgba(100, 255, 218, 0.12);
  font-family: 'SF Mono', 'Menlo', 'Consolas', 'Roboto Mono', monospace;
  letter-spacing: 0.02em;
  text-align: center;
  margin-bottom: 3px;
  box-shadow: none;
}

/* ===== 标题行布局（嵌套单词） ===== */
.wxt-word-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 4px;
}

.wxt-word-title-row .wxt-word-main {
  flex: 1;
}

.wxt-word-title-row .wxt-accent-buttons {
  flex-shrink: 0;
}

/* ===== 口音按钮组 ===== */
.wxt-accent-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.wxt-accent-group {
  display: flex;
  align-items: center;
  gap: 3px;
}

.wxt-accent-label {
  font-size: 10px;
  font-weight: 600;
  color: #8e8e93;
  min-width: 14px;
  text-align: center;
  letter-spacing: 0.3px;
  background: none;
  padding: 0;
  border-radius: 0;
}

.wxt-accent-audio-btn {
  background: rgba(100, 255, 218, 0.1);
  border: 1px solid rgba(100, 255, 218, 0.15);
  border-radius: 6px;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #64ffda;
  transition: all 0.15s cubic-bezier(0.2, 0.6, 0.35, 1);
  flex-shrink: 0;
  box-shadow: none;
}

.wxt-accent-audio-btn:hover {
  background: rgba(100, 255, 218, 0.18);
  border-color: rgba(100, 255, 218, 0.3);
  transform: scale(1.1);
}

.wxt-accent-audio-btn:active {
  transform: scale(0.95);
  background: rgba(100, 255, 218, 0.25);
}

/* ===== 嵌套悬浮框中的词义/音标 ===== */
.wxt-word-tooltip .wxt-meaning-container {
  margin-top: 8px;
  padding-top: 8px;
  min-height: 20px;
}

.wxt-word-tooltip .wxt-meaning-text {
  font-size: 12px;
  padding: 0;
}

.wxt-word-tooltip .wxt-meaning-loading {
  font-size: 0;
}

.wxt-word-tooltip .wxt-meaning-loading::before {
  height: 10px;
}

.wxt-word-tooltip .wxt-meaning-loading::after {
  height: 10px;
  width: 60%;
}

/* ===== 响应式 ===== */
@media (max-width: 480px) {
  .wxt-tooltip-card {
    min-width: 200px;
    max-width: 280px;
    border-radius: 14px;
  }

  .wxt-tooltip-header {
    padding: 12px 14px 10px;
  }

  .wxt-word-main {
    font-size: 15px;
  }

  .wxt-phonetic-text {
    font-size: 12px;
  }

  .wxt-audio-btn {
    width: 32px;
    height: 32px;
    border-radius: 8px;
  }

  .wxt-audio-btn svg {
    width: 14px;
    height: 14px;
  }

  .wxt-meaning-text {
    font-size: 12px;
  }
}
`;
