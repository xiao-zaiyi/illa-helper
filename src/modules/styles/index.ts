/**
 * 样式模块索引
 * 统一导出所有样式相关的模块和类
 */

// 导入所有样式常量
import { CSS_VARIABLES } from './constants/variables';
import { BASE_STYLES } from './core/base';
import { TRANSLATION_STYLES } from './themes/translation';
import { PRONUNCIATION_STYLES } from './components/pronunciation';
import { TOOLTIP_STYLES } from './components/tooltip';

// 导出样式常量
export {
  CSS_VARIABLES,
  BASE_STYLES,
  TRANSLATION_STYLES,
  PRONUNCIATION_STYLES,
  TOOLTIP_STYLES,
};

// 导出StyleManager类（避免循环依赖）
export { StyleManager } from './core/StyleManager';

// 合并所有样式
export const ALL_STYLES = `
${CSS_VARIABLES}
${BASE_STYLES}
${TRANSLATION_STYLES}
${PRONUNCIATION_STYLES}
${TOOLTIP_STYLES}
`;
