/**
 * UI界面相关类型定义
 * 包含悬浮球、快捷键、界面配置等相关接口
 */

// 快捷键配置接口
export interface TooltipHotkey {
  enabled: boolean; // 是否启用快捷键要求
  modifierKeys: string[]; // 修饰键数组 ['ctrl', 'alt', 'shift']
  key?: string; // 可选的附加键
  description?: string; // 快捷键描述
}

// 悬浮球配置接口
export interface FloatingBallConfig {
  enabled: boolean; // 是否启用悬浮球
  position: number; // 垂直位置百分比 (0-100)
  opacity: number; // 透明度 (0.1-1.0)
}
