/**
 * 发音功能样式
 * 与 tooltip.ts 新设计保持一致
 */

export const PRONUNCIATION_STYLES = `
/* 发音功能样式 */
.wxt-pronunciation-enabled {
  position: relative;
  transition: background-color 0.15s ease;
}

.wxt-pronunciation-enabled:hover {
  background-color: rgba(100, 255, 218, 0.06);
  border-radius: 3px;
}

.wxt-pronunciation-loading {
  opacity: 0.7;
  position: relative;
}

.wxt-pronunciation-loading::after {
  content: '';
  position: absolute;
  width: 10px;
  height: 10px;
  margin: auto;
  border: 1.5px solid transparent;
  border-top-color: #64ffda;
  border-radius: 50%;
  animation: wxt-spin 0.8s linear infinite;
  top: -2px;
  right: -14px;
}

/* 音频按钮样式（独立使用时） */
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
}

.wxt-audio-btn:hover {
  background: rgba(100, 255, 218, 0.18);
  border-color: rgba(100, 255, 218, 0.35);
  transform: scale(1.06);
}

.wxt-audio-btn:active {
  transform: scale(0.96);
  background: rgba(100, 255, 218, 0.25);
}

/* 音标样式 */
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

/* 音标错误提示样式 */
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

/* 音标加载状态 - Shimmer */
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
`;
