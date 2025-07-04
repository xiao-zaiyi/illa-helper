/**
 * CSS 变量常量
 * 定义样式系统的基础变量
 */

export const CSS_VARIABLES = `
:root {
  --wxt-primary-color: #6a88e0;
  --wxt-accent-color: #ffafcc;
  --wxt-label-color: #546e7a;
}
`;

/**
 * CSS 变量枚举
 */
export const STYLE_VARS = {
  PRIMARY_COLOR: '#6a88e0',
  ACCENT_COLOR: '#ffafcc',
  LABEL_COLOR: '#546e7a',
  TOOLTIP_BG: '#2c2c2e',
  TOOLTIP_BORDER: '#48484a',
  PHONETIC_COLOR: '#64ffda',
  ERROR_COLOR: '#ff9999',
  SUCCESS_COLOR: '#1de9b6',
} as const;

/**
 * 动画常量
 */
export const ANIMATIONS = {
  TOOLTIP_APPEAR: 'wxt-tooltip-appear 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  SPIN: 'spin 1s linear infinite',
  TRANSITION_FAST: '0.2s ease',
  TRANSITION_SMOOTH: '0.2s cubic-bezier(0.4, 0, 0.2, 1)',
} as const;

/**
 * Z-index 层级
 */
export const Z_INDEX = {
  TOOLTIP: 10000,
  HOVER_AREA: 1,
} as const;
