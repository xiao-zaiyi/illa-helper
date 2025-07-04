/**
 * 发音功能样式
 * 包含发音功能相关的所有样式定义，基于原始样式重建
 */

export const PRONUNCIATION_STYLES = `
/* 发音功能样式 */
.wxt-pronunciation-enabled {
  position: relative;
  transition: all 0.2s ease;
}

.wxt-pronunciation-enabled:hover {
  background-color: rgba(106, 136, 224, 0.1);
  border-radius: 3px;
}

.wxt-pronunciation-loading {
  opacity: 0.7;
  position: relative;
}

.wxt-pronunciation-loading::after {
  content: '';
  position: absolute;
  width: 12px;
  height: 12px;
  margin: auto;
  border: 2px solid transparent;
  border-top-color: #6a88e0;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  top: -2px;
  right: -16px;
}

/* 音频按钮样式 */
.wxt-audio-btn {
  background: linear-gradient(135deg, #64ffda 0%, #1de9b6 100%);
  border: none;
  border-radius: 8px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #000000;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
  box-shadow:
    0 3px 8px rgba(100, 255, 218, 0.3),
    0 0 0 1px rgba(255, 255, 255, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.wxt-audio-btn:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow:
    0 5px 15px rgba(100, 255, 218, 0.4),
    0 0 0 1px rgba(255, 255, 255, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.25);
}

.wxt-audio-btn:active {
  transform: translateY(-1px) scale(1.02);
  box-shadow:
    0 2px 6px rgba(100, 255, 218, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

/* 音标样式 */
.wxt-phonetic-text {
  font-family: 'SF Mono', 'Monaco', 'Consolas', 'Roboto Mono', monospace;
  font-size: 15px;
  color: #64ffda;
  font-style: normal;
  font-weight: 600;
  background: linear-gradient(135deg, rgba(100, 255, 218, 0.15) 0%, rgba(52, 211, 153, 0.15) 100%);
  padding: 6px 12px;
  border-radius: 8px;
  display: inline-block;
  border: 1px solid rgba(100, 255, 218, 0.3);
  letter-spacing: 0.03em;
  box-shadow: 0 2px 8px rgba(100, 255, 218, 0.15);
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

/* 注意：音标行样式已移至 tooltip.ts，因为主要在悬浮框中使用 */

/* 音标加载状态 */
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

/* 注意：口音按钮样式已移至 tooltip.ts 避免重复 */
`;
