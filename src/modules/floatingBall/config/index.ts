/**
 * 悬浮球配置
 */

import type { FloatingBallConfig } from '../../shared/types/ui';

// 默认悬浮球配置
export const DEFAULT_FLOATING_BALL_CONFIG: FloatingBallConfig = {
  enabled: true,
  position: 50, // 中间位置
  opacity: 0.8, // 80% 透明度
};

// 悬浮球样式配置 - 自定义蓝色风格
export const FLOATING_BALL_STYLES = {
  size: 34, // 悬浮球大小 (px)
  iconSize: 20, // 图标大小 (px)
  borderRadius: '50%', // 圆形
  zIndex: 10000, // 层级
  right: '0px', // 贴右边
  // 主色：自定义蓝色
  background: '#6A88E0',
  // 悬停：更亮的蓝色
  hoverBackground: '#7B96E5',
  // 激活：红色
  activeBackground: '#AA466E',
  // 主要阴影
  boxShadow: '0 4px 12px rgba(106, 136, 224, 0.25)',
  // 悬停阴影
  hoverBoxShadow: '0 6px 16px rgba(106, 136, 224, 0.35)',
  // 激活阴影
  activeBoxShadow: '0 6px 16px rgba(76, 175, 80, 0.3)',
  transition: 'all 0.2s ease',
  hoverScale: 1.05,
};

// 菜单样式配置
export const MENU_STYLES = {
  itemSize: 30, // 菜单项大小 (px) - 稍微缩小
  itemIconSize: 16, // 菜单项图标大小 (px)
  expandRadius: 0, // 垂直布局不需要圆形半径
  itemSpacing: 8, // 菜单项间距 (px) - 垂直间距
  background: 'rgba(106, 136, 224, 0.15)', // 主题色半透明背景
  hoverBackground: 'rgba(106, 136, 224, 0.25)', // 悬停时增加不透明度
  border: '1px solid rgba(106, 136, 224, 0.2)', // 主题色半透明边框
  boxShadow:
    '0 8px 24px rgba(106, 136, 224, 0.2), 0 4px 8px rgba(0, 0, 0, 0.1)', // 双重阴影
  backdropFilter: 'blur(12px) saturate(1.5)', // 增强模糊和饱和度
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  zIndex: 9999,
};

// 拖拽配置
export const DRAG_CONFIG = {
  threshold: 5, // 拖拽触发阈值 (px)
  minPosition: 5, // 最小位置 (%)
  maxPosition: 95, // 最大位置 (%)
  animationDuration: 300, // 动画持续时间 (ms)
};

// 菜单操作配置 - 使用 SVG 图标
export const MENU_ACTIONS = [
  {
    id: 'translate',
    label: '翻译',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>',
    color: '#6A88E0',
  },
  {
    id: 'settings',
    label: '设置',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 7h10"/><path d="M7 12h10"/><path d="M7 17h10"/></svg>',
    color: '#6A88E0',
  },
  {
    id: 'options',
    label: '选项',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
    color: '#6A88E0',
  },
  {
    id: 'close',
    label: '关闭',
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>',
    color: '#EF4444',
  },
] as const;
