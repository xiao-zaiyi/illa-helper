/**
 * 悬浮球功能类型定义
 */

// 悬浮球配置接口
export interface FloatingBallConfig {
  enabled: boolean; // 是否启用悬浮球
  position: number; // 垂直位置百分比 (0-100)
  opacity: number; // 透明度 (0.1-1.0)
}

// 悬浮球事件类型
export type FloatingBallEventType = 'translate' | 'drag' | 'click' | 'menu';

// 悬浮球操作类型
export type FloatingBallActionType =
  | 'settings' // 打开设置
  | 'close' // 关闭悬浮球
  | 'toggle_menu' // 切换菜单
  | 'options'; // 打开选项

// 悬浮球状态
export interface FloatingBallState {
  isDragging: boolean;
  isVisible: boolean;
  isMenuExpanded: boolean; // 新增：菜单是否展开
  currentPosition: number;
  isTranslateActive: boolean; // 新增：翻译功能是否激活
}
