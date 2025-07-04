/**
 * 工具提示样式
 * 包含工具提示相关的所有样式定义，基于原始样式完整重建
 */

export const TOOLTIP_STYLES = `
/* 深色词典风格工具提示卡片 */
.wxt-pronunciation-tooltip {
  position: fixed;
  z-index: 10000;
  pointer-events: auto;
  animation: wxt-tooltip-appear 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  filter: drop-shadow(0 20px 25px rgba(0, 0, 0, 0.25)) drop-shadow(0 10px 10px rgba(0, 0, 0, 0.06));
}

@keyframes wxt-tooltip-appear {
  from {
    opacity: 0;
    transform: translateY(-12px) scale(0.94);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.wxt-tooltip-card {
  background: linear-gradient(145deg, #2c2c2e 0%, #1c1c1e 100%);
  border: 1px solid #48484a;
  border-radius: 14px;
  box-shadow:
    0 16px 32px -10px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  padding: 0;
  min-width: 220px;
  max-width: 300px;
  color: white;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(20px);
}

.wxt-tooltip-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), transparent);
}

.wxt-tooltip-header {
  background: linear-gradient(135deg, rgba(58, 58, 60, 0.8) 0%, rgba(42, 42, 44, 0.9) 100%);
  padding: 16px 16px 12px 16px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  position: relative;
}

.wxt-tooltip-header::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 16px;
  right: 16px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08), transparent);
}

.wxt-tooltip-body {
  font-size: 12px;
}

.wxt-phrase-words {
  padding: 3px 2px;
  font-size: 12px;
}

.wxt-word-info {
  flex: 1;
  min-width: 0;
}

.wxt-word-main {
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 0;
  word-break: break-word;
  letter-spacing: -0.02em;
  line-height: 1.2;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.wxt-phonetic-row {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.wxt-phonetic-text {
  font-family: 'SF Mono', 'Monaco', 'Consolas', 'Roboto Mono', monospace;
  font-size: 13px;
  color: #64ffda;
  font-style: normal;
  font-weight: 600;
  background: linear-gradient(135deg, rgba(100, 255, 218, 0.15) 0%, rgba(52, 211, 153, 0.15) 100%);
  padding: 4px 8px;
  border-radius: 6px;
  display: inline-block;
  border: 1px solid rgba(100, 255, 218, 0.3);
  letter-spacing: 0.02em;
  box-shadow: 0 2px 6px rgba(100, 255, 218, 0.15);
}

/* 音标错误提示样式 */
.wxt-phonetic-error {
  font-family: 'SF Mono', 'Monaco', 'Consolas', 'Roboto Mono', monospace;
  font-size: 13px;
  color: #ff9999;
  font-style: italic;
  font-weight: 500;
  background: linear-gradient(135deg, rgba(255, 153, 153, 0.1) 0%, rgba(255, 153, 153, 0.05) 100%);
  padding: 4px 8px;
  border-radius: 6px;
  display: inline-block;
  border: 1px solid rgba(255, 153, 153, 0.3);
  letter-spacing: 0.02em;
  opacity: 0.8;
}

/* 嵌套单词悬浮框标题行布局 */
.wxt-word-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
}

.wxt-word-title-row .wxt-word-main {
  flex: 1;
}

.wxt-word-title-row .wxt-accent-buttons {
  flex-shrink: 0;
}

.wxt-audio-btn {
  background: linear-gradient(135deg, #64ffda 0%, #1de9b6 100%);
  border: none;
  border-radius: 10px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #000000;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
  box-shadow:
    0 3px 10px rgba(100, 255, 218, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  position: relative;
  overflow: hidden;
}

.wxt-audio-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 50%);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.wxt-audio-btn:hover {
  transform: translateY(-2px) scale(1.08);
  box-shadow:
    0 8px 20px rgba(100, 255, 218, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
}

.wxt-audio-btn:hover::before {
  opacity: 1;
}

.wxt-audio-btn:active {
  transform: translateY(-1px) scale(1.02);
  box-shadow:
    0 4px 12px rgba(100, 255, 218, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.wxt-audio-btn svg {
  width: 14px;
  height: 14px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
}

/* 工具提示箭头 */
.wxt-tooltip-arrow {
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  width: 12px;
  height: 12px;
  background: #2a2a2c;
  border: 1px solid #48484a;
  border-top: none;
  border-left: none;
}

.wxt-tooltip-arrow-top {
  bottom: auto;
  top: -6px;
  transform: translateX(-50%) rotate(-135deg);
  border: 1px solid #48484a;
  border-bottom: none;
  border-right: none;
}

/* 短语相关样式 */
.wxt-phrase-text {
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
  margin: 2px 0 0 0;
  line-height: 1.3;
  opacity: 0.95;
}

.wxt-word-list {
  line-height: 1.6;
  padding: 3px 0;
  font-size: 11px;
}

.wxt-interactive-word {
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: inline-block;
  margin: 1px 2px;
  color: #e5e5e7;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-weight: 500;
  font-size: 11px;
}

.wxt-interactive-word:hover {
  background: rgba(52, 211, 153, 0.15);
  color: #34d399;
  transform: translateY(-1px);
  border-color: rgba(52, 211, 153, 0.3);
  box-shadow: 0 2px 8px rgba(52, 211, 153, 0.2);
}

/* 单词悬浮框样式(更小更简洁) */
.wxt-word-tooltip {
  position: fixed;
  z-index: 10001;
  visibility: hidden;
  opacity: 0;
  transition: all 0.2s ease;
  pointer-events: auto;
  animation: wxt-word-tooltip-appear 0.15s ease-out;
}

.wxt-word-tooltip[data-show="true"] {
  visibility: visible;
  opacity: 1;
}

@keyframes wxt-word-tooltip-appear {
  from {
    opacity: 0;
    transform: translateY(-4px) scale(0.9);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.wxt-word-tooltip-card {
  background: linear-gradient(145deg, #2c2c2e 0%, #1c1c1e 100%);
  border: 1px solid #48484a;
  border-radius: 10px;
  padding: 12px 14px;
  color: white;
  font-size: 12px;
  box-shadow:
    0 10px 25px rgba(0, 0, 0, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  max-width: 200px;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(15px);
}

.wxt-word-tooltip-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
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
  font-size: 13px;
  color: #ffffff;
  letter-spacing: -0.02em;
  margin-bottom: 0;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.wxt-word-tooltip-header .wxt-phonetic-row {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
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
  font-weight: 600;
  background: linear-gradient(135deg, rgba(100, 255, 218, 0.12) 0%, rgba(52, 211, 153, 0.12) 100%);
  padding: 4px 8px;
  border-radius: 5px;
  border: 1px solid rgba(100, 255, 218, 0.25);
  font-family: 'SF Mono', 'Monaco', 'Consolas', 'Roboto Mono', monospace;
  letter-spacing: 0.02em;
  box-shadow: 0 1px 3px rgba(100, 255, 218, 0.1);
  text-align: center;
  margin-bottom: 3px;
}

.wxt-accent-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.wxt-accent-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.wxt-accent-label {
  font-size: 10px;
  font-weight: 600;
  color: #a0a0a0;
  min-width: 14px;
  text-align: center;
  background: rgba(255, 255, 255, 0.08);
  padding: 1px 4px;
  border-radius: 3px;
  letter-spacing: 0.3px;
}

.wxt-accent-audio-btn {
  background: linear-gradient(135deg, #64ffda 0%, #1de9b6 100%);
  border: none;
  border-radius: 5px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #000000;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
  box-shadow:
    0 2px 5px rgba(100, 255, 218, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

.wxt-accent-audio-btn:hover {
  transform: translateY(-1px) scale(1.1);
  box-shadow:
    0 3px 8px rgba(100, 255, 218, 0.35),
    0 0 0 1px rgba(255, 255, 255, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.wxt-accent-audio-btn:active {
  transform: translateY(0) scale(1.05);
  box-shadow:
    0 1px 4px rgba(100, 255, 218, 0.2),
    0 0 0 1px rgba(255, 255, 255, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

/* 词义容器样式 */
.wxt-meaning-container {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  min-height: 20px;
  display: flex;
  align-items: center;
}

.wxt-meaning-text {
  font-size: 11px;
  color: #e5e5e7;
  line-height: 1.4;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%);
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin: 0;
  font-style: italic;
  opacity: 0.95;
  flex: 1;
}

.wxt-meaning-loading {
  font-size: 11px;
  color: #a0a0a0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 5px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-style: italic;
  flex: 1;
}

.wxt-meaning-loading::after {
  content: '';
  width: 12px;
  height: 12px;
  border: 2px solid transparent;
  border-top-color: #64ffda;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  flex-shrink: 0;
}

.wxt-phonetic-loading {
  font-size: 12px;
  color: #a0a0a0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  font-style: italic;
  margin-bottom: 4px;
  text-align: center;
}

.wxt-phonetic-loading::after {
  content: '';
  width: 10px;
  height: 10px;
  border: 2px solid transparent;
  border-top-color: #64ffda;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  flex-shrink: 0;
}

/* 词义容器在单词悬浮框中的样式 */
.wxt-word-tooltip .wxt-meaning-container {
  margin-top: 6px;
  padding-top: 6px;
  min-height: 20px;
}

.wxt-word-tooltip .wxt-meaning-text {
  font-size: 12px;
  padding: 6px 10px;
}

.wxt-word-tooltip .wxt-meaning-loading {
  font-size: 11px;
  padding: 4px 8px;
}

.wxt-word-tooltip .wxt-meaning-loading::after {
  width: 10px;
  height: 10px;
}

/* 响应式适配 */
@media (max-width: 480px) {
  .wxt-tooltip-card {
    min-width: 200px;
    max-width: 280px;
  }

  .wxt-tooltip-header {
    padding: 14px 14px 10px 14px;
  }

  .wxt-word-main {
    font-size: 13px;
  }

  .wxt-phonetic-text {
    font-size: 12px;
  }

  .wxt-audio-btn {
    width: 32px;
    height: 32px;
  }

  .wxt-audio-btn svg {
    width: 12px;
    height: 12px;
  }
}
`;
